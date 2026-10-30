// Preserve all text, including spaces, and prefer word boundaries within 45 characters.
export function proformaPartyTextLines(value: string): string[] {
  return value.split(/\r?\n/).flatMap((line) => {
    const characters = Array.from(line);
    const lines: string[] = [];
    let index = 0;
    while (characters.length - index > 45) {
      let length = 45;
      // A word that fits should stay intact; split only words longer than the limit.
      if (!/\s/.test(characters[index + 45])) {
        for (let offset = 44; offset > 0; offset--) {
          if (/\s/.test(characters[index + offset])) {
            length = offset + 1;
            break;
          }
        }
      }
      lines.push(characters.slice(index, index + length).join(""));
      index += length;
    }
    if (index < characters.length) lines.push(characters.slice(index).join(""));
    return lines.length ? lines : [""];
  });
}
