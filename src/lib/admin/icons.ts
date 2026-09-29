import type { Component } from 'svelte';
import Box from '@lucide/svelte/icons/box';
import FileText from '@lucide/svelte/icons/file-text';
import Newspaper from '@lucide/svelte/icons/newspaper';
import Folder from '@lucide/svelte/icons/folder';
import Tag from '@lucide/svelte/icons/tag';
import Image from '@lucide/svelte/icons/image';
import Images from '@lucide/svelte/icons/images';
import Text from '@lucide/svelte/icons/text';
import Megaphone from '@lucide/svelte/icons/megaphone';
import CircleHelp from '@lucide/svelte/icons/circle-help';
import Sparkles from '@lucide/svelte/icons/sparkles';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Link from '@lucide/svelte/icons/link';
import Users from '@lucide/svelte/icons/users';
import Calendar from '@lucide/svelte/icons/calendar';
import Mail from '@lucide/svelte/icons/mail';

/**
 * Icons for `icon` names in blocks/collections. Lucide icons cannot be imported
 * dynamically by name, so new names must be added here.
 */
const icons: Record<string, Component<{ class?: string }>> = {
	box: Box,
	'file-text': FileText,
	newspaper: Newspaper,
	folder: Folder,
	tag: Tag,
	image: Image,
	images: Images,
	text: Text,
	megaphone: Megaphone,
	'circle-help': CircleHelp,
	sparkles: Sparkles,
	'layout-grid': LayoutGrid,
	link: Link,
	users: Users,
	calendar: Calendar,
	mail: Mail
};

export function iconFor(name?: string): Component<{ class?: string }> {
	return (name && icons[name]) || Box;
}
