import { toast as sonnerToast } from 'sonner'
import { playMkdsBalloonPop, playMkdsBalloonGet, playMkdsWfcError } from '@/lib/mkdsSounds'
import { isUiSoundEnabled } from '@/lib/uiSoundPrefs'

const playIfEnabled = (playFn) => {
    if (isUiSoundEnabled()) playFn()
}

export const toast = {
    success: (...args) => {
        playIfEnabled(playMkdsBalloonGet)
        return sonnerToast.success(...args)
    },
    error: (...args) => {
        playIfEnabled(playMkdsWfcError)
        return sonnerToast.error(...args)
    },
    info: (...args) => {
        playIfEnabled(playMkdsBalloonPop)
        return sonnerToast.info(...args)
    },
    warning: (...args) => {
        playIfEnabled(playMkdsBalloonPop)
        return sonnerToast.warning(...args)
    },
    message: (...args) => {
        playIfEnabled(playMkdsBalloonPop)
        return sonnerToast.message(...args)
    },
    custom: (...args) => sonnerToast.custom(...args),
    promise: (...args) => sonnerToast.promise(...args),
    dismiss: (...args) => sonnerToast.dismiss(...args),
}
