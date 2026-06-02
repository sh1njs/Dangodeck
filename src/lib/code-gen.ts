export const LANGS = ['cURL', 'JavaScript', 'TypeScript', 'Python', 'PHP', 'Go'] as const;
export type Lang = (typeof LANGS)[number];

export function genCode(lang: Lang, base: string, path: string): string {
  const url = `${base}${path}`;
  switch (lang) {
    case 'cURL':
      return `curl -s "${url}"`;
    case 'JavaScript':
      return `const res = await fetch("${url}");\nconst { data } = await res.json();\nconsole.log(data);`;
    case 'TypeScript':
      return `const res = await fetch("${url}");\nconst { data } = (await res.json()) as { data: unknown };\nconsole.log(data);`;
    case 'Python':
      return `import requests\n\nres = requests.get("${url}")\nprint(res.json()["data"])`;
    case 'PHP':
      return `<?php\n$res = file_get_contents("${url}");\n$json = json_decode($res, true);\nprint_r($json["data"]);`;
    case 'Go':
      return `package main\n\nimport (\n\t"encoding/json"\n\t"fmt"\n\t"net/http"\n)\n\nfunc main() {\n\tres, _ := http.Get("${url}")\n\tdefer res.Body.Close()\n\tvar out map[string]any\n\tjson.NewDecoder(res.Body).Decode(&out)\n\tfmt.Println(out["data"])\n}`;
  }
}

export function genAll(base: string, path: string): { lang: Lang; code: string }[] {
  return LANGS.map((lang) => ({ lang, code: genCode(lang, base, path) }));
}
