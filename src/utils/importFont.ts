const fs = require('fs');

export function importFont(font_path: string, media_type: string) {
    const buff = fs.readFileSync(font_path);
    const base64data = buff.toString('base64');
    return `data:${media_type};charset=utf-8;base64,${base64data}`;
}
