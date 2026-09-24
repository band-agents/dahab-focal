import type { UploaderLabels } from '@/components/ui/Uploader';

import type { Translate } from './i18n';

/** The uploader's words, in the screen's language. A story may be a video; nothing else may. */
export function uploaderLabels(t: Translate, media: 'photo' | 'photoOrVideo'): UploaderLabels {
  return {
    choose: media === 'photo' ? t('partner.upload.choosePhoto') : t('partner.upload.chooseMedia'),
    change: t('partner.upload.change'),
    uploading: t('partner.upload.uploading'),
    done: t('partner.upload.done'),
    tooLongVideo: t('partner.upload.tooLongVideo'),
    failed: t('partner.upload.failed'),
    wrongType: t('partner.upload.wrongType'),
  };
}
