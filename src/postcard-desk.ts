import { encodePostcard, type IslandView } from './postcard';
import { readPostcard } from './postcard-png';

export function connectPostcardDesk(
  dialog: HTMLDialogElement,
  currentView: () => IslandView,
  applyView: (view: IslandView, message: string) => void,
) {
  const address = dialog.querySelector<HTMLInputElement>('#postcard-address')!;
  const copy = dialog.querySelector<HTMLButtonElement>('#copy-postcard')!;
  const copyStatus = dialog.querySelector<HTMLElement>('#postcard-copy-status')!;
  const input = dialog.querySelector<HTMLInputElement>('#postcard-file')!;
  const choose = dialog.querySelector<HTMLButtonElement>('#choose-postcard')!;
  const open = dialog.querySelector<HTMLButtonElement>('#open-postcard')!;
  const back = dialog.querySelector<HTMLButtonElement>('#return-postcard-view')!;
  const preview = dialog.querySelector<HTMLImageElement>('#postcard-preview')!;
  const fileStatus = dialog.querySelector<HTMLElement>('#postcard-file-status')!;
  let previous: IslandView | null = null;
  let selected: IslandView | null = null;
  let previewUrl: string | undefined;
  let selection = 0;

  function clearFile() {
    selection++;
    selected = null;
    open.hidden = true;
    preview.hidden = true;
    preview.removeAttribute('src');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    input.value = '';
    fileStatus.textContent = '';
  }

  copy.addEventListener('click', async () => {
    const link = address.value;
    try {
      await navigator.clipboard.writeText(link);
      if (dialog.open && address.value === link) copyStatus.textContent = 'Link copied.';
    } catch {
      if (!dialog.open || address.value !== link) return;
      address.focus();
      address.select();
      copyStatus.textContent = 'Link selected. Copy it with your device’s copy command.';
    }
  });
  address.addEventListener('focus', () => address.select());
  choose.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    clearFile();
    const request = selection;
    fileStatus.textContent = 'Reading postcard…';
    try {
      const result = await readPostcard(file);
      if (request !== selection || !dialog.open) return;
      if (result.status !== 'ready') {
        fileStatus.textContent = {
          missing: 'This PNG has no saved island view. Try an original download from the Sanctum.',
          invalid: 'This postcard couldn’t be read. Try the original PNG.',
          'too-large': 'Choose a postcard PNG smaller than 16 MB.',
        }[result.status];
        return;
      }
      previewUrl = URL.createObjectURL(new Blob([file], {type:'image/png'}));
      preview.src = previewUrl;
      await preview.decode();
      if (request !== selection || !dialog.open) return;
      selected = result.view;
      preview.hidden = false;
      open.hidden = false;
      fileStatus.textContent = 'Ready to open. You can return to your previous island view.';
    } catch {
      if (request !== selection || !dialog.open) return;
      clearFile();
      fileStatus.textContent = 'This postcard couldn’t be read. Try the original PNG.';
    }
  });

  open.addEventListener('click', () => {
    if (!selected) return;
    const view = selected;
    previous = currentView();
    clearFile();
    dialog.close();
    applyView(view, 'Postcard opened. Return to your previous island view from Link.');
  });

  back.addEventListener('click', () => {
    if (!previous) return;
    const view = previous;
    previous = null;
    clearFile();
    dialog.close();
    applyView(view, 'Your previous island view is back.');
  });
  dialog.addEventListener('close', clearFile);

  return {
    show() {
      const fragment = encodePostcard(currentView());
      copy.disabled = !fragment;
      address.value = fragment ? new URL(fragment, location.href).href : '';
      copyStatus.textContent = fragment ? '' : 'This view couldn’t be put in a link.';
      back.hidden = !previous;
      dialog.showModal();
    },
  };
}
