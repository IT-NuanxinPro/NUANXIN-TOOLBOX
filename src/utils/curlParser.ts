export interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

function tokenizeShellCommand(raw: string) {
  const input = raw.replace(/\\\r?\n/g, ' ');
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;

  const pushCurrent = () => {
    if (!current) return;
    tokens.push(current);
    current = '';
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quote === 'single') {
      if (character === "'") quote = null;
      else current += character;
      continue;
    }

    if (quote === 'double') {
      if (character === '"') {
        quote = null;
      } else if (character === '\\' && index + 1 < input.length) {
        current += input[index + 1];
        index += 1;
      } else {
        current += character;
      }
      continue;
    }

    if (character === "'") {
      quote = 'single';
    } else if (character === '"') {
      quote = 'double';
    } else if (/\s/.test(character)) {
      pushCurrent();
    } else if (character === '\\' && index + 1 < input.length) {
      current += input[index + 1];
      index += 1;
    } else {
      current += character;
    }
  }

  pushCurrent();
  return tokens;
}

function splitHeader(value: string) {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex <= 0) return null;
  return {
    key: value.slice(0, separatorIndex).trim(),
    value: value.slice(separatorIndex + 1).trim(),
  };
}

export function parseCurlCommand(raw: string): ParsedCurl {
  const tokens = tokenizeShellCommand(raw.trim());
  const headers: Record<string, string> = {};
  let url = '';
  let method = '';
  let body = '';

  for (let index = tokens[0] === 'curl' ? 1 : 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === '-X' || token === '--request') {
      method = (tokens[index + 1] || '').toUpperCase();
      index += 1;
      continue;
    }
    if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase();
      continue;
    }
    if (token.startsWith('--request=')) {
      method = token.slice('--request='.length).toUpperCase();
      continue;
    }

    if (token === '-H' || token === '--header') {
      const parsedHeader = splitHeader(tokens[index + 1] || '');
      if (parsedHeader) headers[parsedHeader.key] = parsedHeader.value;
      index += 1;
      continue;
    }
    if (token.startsWith('-H') && token.length > 2) {
      const parsedHeader = splitHeader(token.slice(2));
      if (parsedHeader) headers[parsedHeader.key] = parsedHeader.value;
      continue;
    }
    if (token.startsWith('--header=')) {
      const parsedHeader = splitHeader(token.slice('--header='.length));
      if (parsedHeader) headers[parsedHeader.key] = parsedHeader.value;
      continue;
    }

    if (['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'].includes(token)) {
      body = tokens[index + 1] || '';
      index += 1;
      continue;
    }
    const dataOption = ['--data=', '--data-raw=', '--data-binary=', '--data-urlencode=']
      .find((prefix) => token.startsWith(prefix));
    if (dataOption) {
      body = token.slice(dataOption.length);
      continue;
    }

    if (token === '--url') {
      url = tokens[index + 1] || '';
      index += 1;
      continue;
    }
    if (token.startsWith('--url=')) {
      url = token.slice('--url='.length);
      continue;
    }

    if (!url && /^https?:\/\//i.test(token)) url = token;
  }

  if (!method) method = body ? 'POST' : 'GET';
  return { url, method, headers, body };
}
