import { toast as sonnerToast } from 'sonner'
import { playMkdsBalloonPop, playMkdsBalloonGet, playMkdsWfcError } from '@/lib/mkdsSounds'

export const toast = {
    success: (...args) => {
        playMkdsBalloonGet()
        return sonnerToast.success(...args)
    },
    error: (...args) => {
        playMkdsWfcError()
        return sonnerToast.error(...args)
    },
    info: (...args) => {
        playMkdsBalloonPop()
        return sonnerToast.info(...args)
    },
    warning: (...args) => {
        playMkdsBalloonPop()
        return sonnerToast.warning(...args)
    },
    message: (...args) => {
        playMkdsBalloonPop()
        return sonnerToast.message(...args)
    },
    custom: (...args) => sonnerToast.custom(...args),
    promise: (...args) => sonnerToast.promise(...args),
    dismiss: (...args) => sonnerToast.dismiss(...args),
}
