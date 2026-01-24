/**
 * Shared test data for both unit and integration tests
 */

export const rawTextProcessorTestSet: Record<string, string> = {
  '"hello"': "“hello”",
  "\"outer 'inner' outer\"": "“outer ‘inner’ outer”",
  "Sentence ending….....": "Sentence ending…",
  "100 µm3": "100 µm³",
  "4X object": "4× object",
};


export const langConfigTestSet: Record<string, Record<string, string>> = {
  "en-us": {
    [`"hello"`]: `“hello”`,
  },
  "de-de": {
    [`"hello"`]: `„hello“`,
  },
  cs: {
    [`"hello"`]: `„hello“`,
  },
  sk: {
    [`"hello"`]: `„hello“`,
  },
  rue: {
    [`"hello"`]: `«hello»`,
  },
};

export const removeLinesConfigTestSet: Record<string, Record<string, string>> = {
  false: {
    'word\n\n\n"hello"': "word\n\n\n“hello”",
  },
  true: {
    'word\n\n\n"hello"': "word\n“hello”",
  },
};