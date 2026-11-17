import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

type Proof = {
  time: number;
  moonArc: number;
  dog: string;
  reflectionFrames: number;
  dogPosition: number[];
  stars: number;
  effects: Record<string, number | boolean>;
  memory: {geometries: number; textures: number};
  moon: number[];
  comet: number[];
  water: number[];
  garden: number[];
};

const proof = (page:Page) => page.evaluate(() =>
  (window as Window & {sanctumProof:()=>Proof}).sanctumProof());

function pixel(page:Page, projection:number[]) {
  const { width, height } = page.viewportSize()!;
  return [(projection[0] + 1) * width / 2, (1 - projection[1]) * height / 2] as const;
}

async function open(page:Page) {
  const errors:string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./');
  await expect(page.locator('canvas[data-ready=true]')).toBeVisible({ timeout: 30_000 });
  return errors;
}

test('desktop island, pointer and keyboard tools, postcard, sound, and every incident', async ({page}, run) => {
  await page.setViewportSize({width:1440,height:900});
  const errors=await open(page);
  await page.screenshot({path:run.outputPath('island-desktop.png')});
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
  await page.locator('#quality').selectOption('low');
  await expect.poll(()=>proof(page).then(s=>s.time)).toBeGreaterThan(3.75);
  const before=await proof(page);
  const [mx,my]=pixel(page,before.moon);
  await page.mouse.move(mx,my);
  await page.mouse.down();
  await page.mouse.move(mx-126,my+9,{steps:3});
  await page.mouse.up();
  await expect.poll(()=>proof(page).then(s=>s.moonArc)).toBeLessThan(-.22);

  await page.locator('#stars').click();
  await page.mouse.move(612,57);
  await page.mouse.down();
  await page.mouse.move(882,64,{steps:9});
  await page.mouse.up();
  await expect.poll(()=>proof(page).then(s=>s.stars)).toBeGreaterThan(2);
  await page.locator('canvas').focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  await page.locator('#garden').click();
  await page.mouse.click(...pixel(page,(await proof(page)).garden));
  await expect(page.locator('#notice')).toContainText('garden woke up');
  await page.locator('#water').click();
  await page.mouse.click(...pixel(page,(await proof(page)).water));
  await expect(page.locator('#notice')).toContainText('ripple crossed');
  await page.keyboard.press('Escape');

  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','true');
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
  await page.locator('#help').click();
  await expect(page.locator('#guide')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#guide')).toBeHidden();

  const saved=page.waitForEvent('download');
  await page.locator('#postcard').click();
  const postcard=await saved;
  await postcard.saveAs(run.outputPath('postcard.png'));
  const png=await readFile(run.outputPath('postcard.png'));
  expect(png.subarray(1,4).toString()).toBe('PNG');
  expect(png.readUInt32BE(16)).toBeGreaterThan(1000);
  expect(png.length).toBeGreaterThan(100_000);

  const memory=(await proof(page)).memory;
  for (const [index,effect] of ['shower','parade','gravity','comet','shower'].entries()){
    await page.locator('#trouble').click();
    await expect(page.locator('#trouble')).toBeDisabled();
    await expect.poll(()=>proof(page).then(s=>Number(s.effects[effect])),{timeout:20000}).toBeGreaterThan(.40);
    if(effect==='comet'){
      await expect.poll(()=>proof(page).then(s=>Boolean(Number(s.effects.comet)>.42&&Math.abs(s.comet[0])<.68&&Math.abs(s.comet[1])<.9))).toBe(true);
    }
    if(index<4) await page.screenshot({path:run.outputPath(`incident-${effect}.png`)});
    await expect(page.locator('#trouble')).toBeEnabled({timeout:20000});
    expect((await proof(page)).effects[effect]).toBe(0);
  }
  const after=await proof(page);
  expect(after.memory.geometries-memory.geometries).toBeLessThan(10);
  expect(after.memory.textures-memory.textures).toBeLessThan(4);
  expect(after.dogPosition).not.toEqual(before.dogPosition);
  await page.locator('#portrait').click();
  await expect(page.locator('#portrait')).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>proof(page).then(s=>s.dog)).toBe('portrait');
  await page.keyboard.press('Escape');
  await expect(page.locator('#portrait')).toHaveAttribute('aria-pressed','false');
  const hasReflectionTarget=await page.locator('canvas').evaluate(canvas=>
    Boolean((canvas as HTMLCanvasElement).getContext('webgl2')?.getExtension('EXT_color_buffer_float')));
  const reflectionBefore=(await proof(page)).reflectionFrames;
  await page.locator('#quality').selectOption('high');
  if(hasReflectionTarget){
    await expect.poll(()=>proof(page).then(s=>s.reflectionFrames),{timeout:12000}).toBeGreaterThan(reflectionBefore);
  }
  await page.locator('#quality').selectOption('low');
  const cappedReflection=(await proof(page)).reflectionFrames;
  await page.evaluate(()=>new Promise<void>(finish=>requestAnimationFrame(()=>requestAnimationFrame(()=>finish()))));
  expect((await proof(page)).reflectionFrames).toBe(cappedReflection);
  expect(errors).toEqual([]);
});

test('mobile touch and reduced motion',async ({browser},run)=>{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const errors=await open(page);
  await page.screenshot({path:run.outputPath('island-mobile.png')});
  await page.locator('#water').tap();
  await page.touchscreen.tap(...pixel(page,(await proof(page)).water));
  await expect(page.locator('#notice')).toContainText('ripple crossed');
  await page.locator('#garden').tap();
  await page.touchscreen.tap(...pixel(page,(await proof(page)).garden));
  await expect(page.locator('#notice')).toContainText('garden woke up');
  await page.locator('#stars').tap();
  await page.touchscreen.tap(173,159);
  await expect.poll(()=>proof(page).then(s=>s.stars)).toBeGreaterThan(0);
  await expect(page.locator('#postcard')).toBeInViewport();
  await page.locator('#portrait').tap();
  await expect(page.locator('#portrait')).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>proof(page).then(s=>s.dog)).toBe('portrait');
  await page.screenshot({path:run.outputPath('portrait-mobile.png')});
  await page.locator('#portrait').tap();
  await expect(page.locator('#portrait')).toHaveAttribute('aria-pressed','false');
  await page.setViewportSize({width:320,height:740});
  const blocked=await page.locator('.controls button, .top-actions button, .top-actions select').evaluateAll(buttons=>
    buttons.flatMap(button=>{
      const box=button.getBoundingClientRect();
      const hit=document.elementFromPoint(box.x+box.width*.5,box.y+box.height*.5);
      const fits=box.width>0&&box.height>=38&&box.x>=0&&box.right<=innerWidth&&box.y>=0&&box.bottom<=innerHeight;
      return fits&&button.contains(hit)?[]:[{id:button.id,hit:hit?.id||hit?.tagName,fits}];
    }));
  expect(blocked).toEqual([]);
  expect(errors).toEqual([]);
  await page.close();
});

test('WebGL failure provides readable recovery', async ({page}) => {
  await page.addInitScript(() => {
    const original=HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{
      value(this: HTMLCanvasElement,type:string, options: unknown) {
        if(type.startsWith('webgl'))return null;
        return Reflect.apply(original,this,[type,options]);
      },
    });
  });
  await page.goto('./');
  await expect(page.locator('#fallback')).toBeVisible();
  await expect(page.locator('#retry')).toBeVisible();
  await expect(page.locator('#postcard')).toBeDisabled();
});
