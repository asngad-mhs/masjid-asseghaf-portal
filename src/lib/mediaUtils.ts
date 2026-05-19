export const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const isVideoMedia = (url: string) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0].toLowerCase();
  return (
    urlWithoutQuery.endsWith('.mp4') || 
    urlWithoutQuery.endsWith('.mov') || 
    urlWithoutQuery.endsWith('.webm') ||
    urlWithoutQuery.endsWith('.ogg')
  );
};
