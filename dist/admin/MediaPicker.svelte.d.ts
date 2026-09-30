import type { MediaRef } from '../types';
type Props = {
    open: boolean;
    accept: 'image' | 'video' | 'file' | 'any';
    onselect: (ref: MediaRef) => void;
};
declare const MediaPicker: import("svelte").Component<Props, {}, "open">;
type MediaPicker = ReturnType<typeof MediaPicker>;
export default MediaPicker;
