import { expect, test, type Page } from '@playwright/test';

type View = {moonArc:number; yaw:number; pitch:number; stars:number; starPositions:number[][]};
const view = (page:Page) => page.evaluate(() =>
  (window as Window & {sanctumProof:()=>View}).sanctumProof());

async function ready(page:Page) {
  await expect(page.locator('canvas[data-ready=true]')).toBeVisible({timeout:30000});
}

test('a living postcard restores an edited constellation and view on another device', async ({browser,baseURL}, run) => {
  const sender=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const origin=new URL(baseURL!).origin;
  await sender.grantPermissions(['clipboard-read','clipboard-write'],{origin});
  const page=await sender.newPage();
  await page.goto(baseURL!);
  await ready(page);
  await page.locator('#quality').selectOption('low');

  await page.keyboard.press('m');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(()=>view(page).then(state=>state.moonArc)).toBeCloseTo(-.28,3);
  await page.keyboard.press('Escape');
  await page.locator('canvas').focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  await expect.poll(()=>view(page).then(state=>state.yaw)).toBeCloseTo(-.22,3);
  await expect.poll(()=>view(page).then(state=>state.pitch)).toBeCloseTo(.07,3);

  await page.locator('#stars').click();
  for(const [x,y] of [[270,47],[390,54],[510,46],[630,63]])await page.mouse.click(x,y);
  await expect.poll(()=>view(page).then(state=>state.stars)).toBe(4);
  await page.locator('#remove-star').click();
  await expect.poll(()=>view(page).then(state=>state.stars)).toBe(3);
  await page.locator('canvas').focus();
  await page.keyboard.press('Backspace');
  await expect.poll(()=>view(page).then(state=>state.stars)).toBe(2);

  const original=await view(page);
  await page.locator('#share').click();
  await expect(page.locator('#postcard-link')).toBeVisible();
  const link=await page.locator('#postcard-address').inputValue();
  expect(link).toMatch(/#postcard=1\.[A-Za-z0-9_-]+$/);
  expect(await page.evaluate(()=>location.hash)).toBe('');
  await page.locator('#copy-postcard').click();
  await expect(page.locator('#postcard-copy-status')).toHaveText('Link copied.');
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(link);
  await page.screenshot({path:run.outputPath('living-postcard.png')});
  await sender.close();

  const receiver=await browser.newContext({
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce',
  });
  const received=await receiver.newPage();
  const errors:string[]=[];
  received.on('pageerror',error=>errors.push(error.message));
  await received.goto(link);
  await ready(received);

  for(let visit=0;visit<2;visit++){
    const replay=await view(received);
    expect(replay.stars).toBe(original.stars);
    expect(replay.moonArc).toBeCloseTo(original.moonArc,3);
    expect(replay.yaw).toBeCloseTo(original.yaw,3);
    expect(replay.pitch).toBeCloseTo(original.pitch,3);
    replay.starPositions.forEach((point,i)=>point.forEach((coordinate,axis)=>
      expect(Math.abs(coordinate-original.starPositions[i][axis])).toBeLessThanOrEqual(.008)));
    await expect(received.locator('#sound')).toHaveAttribute('aria-pressed','false');
    await expect(received.locator('#quality')).toHaveValue('auto');
    if(visit===0){await received.reload();await ready(received);}
  }
  await received.screenshot({path:run.outputPath('restored-mobile.png')});
  await received.evaluate(()=>{location.hash='#postcard=1.malformed';});
  await expect(received.locator('#notice')).toContainText('couldn’t be opened');
  expect((await view(received)).stars).toBe(original.stars);
  expect(errors).toEqual([]);
  await receiver.close();
});

test('an invalid arrival and denied clipboard leave the island and manual copy available', async ({page,baseURL})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{value:{
      writeText:()=>Promise.reject(new DOMException('Denied','NotAllowedError')),
    }});
  });
  await page.goto(baseURL!+'#postcard=2.unknown');
  await ready(page);
  await expect(page.locator('#notice')).toContainText('couldn’t be opened');
  const empty=await view(page);
  expect([empty.stars,empty.moonArc,empty.yaw,empty.pitch]).toEqual([0,0,0,0]);
  await page.locator('#share').click();
  await page.locator('#copy-postcard').click();
  await expect(page.locator('#postcard-copy-status')).toContainText('Link selected.');
  const field=page.locator('#postcard-address');
  await expect(field).toBeFocused();
  expect(await field.evaluate((input:HTMLInputElement)=>input.selectionStart===0&&input.selectionEnd===input.value.length)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#postcard-link')).toBeHidden();
  await expect(page.locator('#share')).toBeFocused();
});
