/**
 * Custom feeds for the public dashboard, set by Tom. Each one gathers every published story whose tags or words
 * match, across all weeks. (Later, signed-in readers could keep their own list of these.)
 */
export interface CustomFeed {
  id: string;
  title: string;
  note: string;
  /** Matches a tag exactly, or a word in the title or summary. */
  match: string[];
  tone: 'tone-orange' | 'tone-pink' | 'tone-blue' | 'tone-lime' | 'tone-teal';
}

export const DASHBOARD = {
  title: "Tom's dashboard",
  intro: 'Standing feeds I keep an eye on, built from every issue so far. Save stories and follow topics and they collect here too.',
  /** Stories taken out of the dashboard for everyone (their URLs). Readers can also remove stories for themselves. */
  exclude: [] as string[],
  feeds: [
    { id: 'glasses', title: 'Smart glasses watch', note: 'Every AR and XR glasses launch, leak and teardown.', match: ['ar-glasses', 'xr-glasses', 'snap', 'spectacles', 'glasses', 'android xr', 'vision pro'], tone: 'tone-orange' },
    { id: 'blender', title: 'Blender & 3D craft', note: 'Tools, nodes and renders worth stealing from.', match: ['blender', 'geometry-nodes', 'procedural-3d', 'substance', '3d-design', 'houdini', 'gaussian', 'splat'], tone: 'tone-pink' },
    { id: 'video', title: 'Generative video', note: 'Sora, Veo, Runway and the work made with them.', match: ['sora', 'veo', 'runway', 'kling', 'video-processing', 'comfyui', 'ai video'], tone: 'tone-blue' },
    { id: 'tools', title: 'Tools to try', note: 'New releases you can open today.', match: ['tool-release', 'xr-tools', 'ar-tools', 'creative-tools', 'open-source', 'lens-studio'], tone: 'tone-lime' },
    { id: 'labs', title: 'The big labs', note: 'OpenAI, Anthropic, Google and Meta, in one place.', match: ['openai', 'anthropic', 'google', 'deepmind', 'meta', 'apple'], tone: 'tone-teal' },
  ] satisfies CustomFeed[],
};
