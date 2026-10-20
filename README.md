# Document classifier

Names a financial document's type (10-K, proxy statement, fund fact sheet, trade confirmation and 17 more) with **Jev**, TypeSafe's decision model, in a few hundred milliseconds for a fraction of a cent. Includes a benchmark against decoder-only LLMs, a bi-encoder and keyword rules.

**Live demo:** [landonthornton.com/classifier](https://landonthornton.com/classifier/)

## Why a decision model

Sorting documents by type is a classic back-office job: every filing, statement and report that comes in has to be routed before anything else can happen to it. I built this to show what a decision model does with that job.

Decision models are a new class of model. They bring frontier-level understanding to a judgment but answer with probabilities instead of generated text. Jev reads the document once and returns a probability for every type, so:

- **It's fast and cheap.** There's no text to generate, and output tokens are free. Inference becomes cheap enough to run on every document, every page or every passage, which opens up work that was too expensive to do with a decoder-only LLM and too subtle for BERT-class models or keyword rules.
- **The answer is typed.** It's always one of the types you defined, with no output to parse or validate.
- **The confidence is usable.** A pipeline can file the sure answers automatically and send the close calls to a person or a larger model.

A BERT-class bi-encoder or a keyword rule is cheaper still, but it reads words, not documents. A 10-Q that cites the 10-K, or an 8-K that attaches an earnings release, fools it.

## Benchmark

43 synthetic documents (two per type plus three that are none of them), each method given the same excerpt and the same 21 types with their definitions. `npm run bench` reproduces it; results are in [`bench/results.json`](bench/results.json).

| Method | Kind | Correct | Median latency | Input tokens / doc | Cost / 1,000 docs |
|---|---|---|---|---|---|
| Jev | Decision model | 43/43 | 136 ms | 3,343 | $0.14 |
| Claude Opus 5.5 | Decoder-only LLM | 43/43 | 1.6 s | 4,398 | $17.91 |
| GPT-5.5 | Decoder-only LLM | 43/43 | 1.1 s | 2,662 | $13.78 |
| Claude Haiku 5.5 | Decoder-only LLM | 41/43 | 954 ms | 4,398 | $0.45 |
| GPT-5.4 mini | Decoder-only LLM | 42/43 | 871 ms | 2,662 | $2.16 |
| MiniLM bi-encoder | Bi-encoder | 18/43 | 155 ms | – | local |
| Keyword rules | Rules | 32/43 | <10 ms | – | local |

Jev matched the frontier LLMs' accuracy at about 1/100 of their cost and 8–11× their speed.

How it was run (October 2026):

- **Calls.** One at a time, from a laptop, so latencies don't affect each other.
- **Models.** Jev was `jev-1.13.0`. Each LLM's answer was constrained to one type code with a JSON schema enum. GPT used low reasoning effort.
- **Costs.** List prices: Jev $0.042 per million input tokens with output free; Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50, GPT-5.5 $5/$30 and GPT-5.4 mini $0.75/$4.50 per million input/output tokens.
- **Local methods.** The bi-encoder (`all-MiniLM-L6-v2`, zero-shot against the type definitions) and the keyword rules run locally, so they cost compute rather than tokens.

**A note on the documents.**

- **Familiar types, high scores.** These are very common document types, the kind of public filings and reports every large model has seen many times in training. None of them is written to be hard to identify, so it's no surprise that Jev and the large LLMs score at or near 100%.
- **Labels and documents line up.** The documents are synthetic, written for this repo with invented companies and modelled on publicly available ones. They were written alongside the type definitions, so the two match closely.
- **What to read from it.** Read the accuracy column with that in mind. The meaningful comparison is speed and cost: how much faster and cheaper a decision model reaches the same answer.
- **Long documents aren't tested here.** Every benchmark document is short enough to be sent whole, so the token savings from parsing long documents don't show. They show on long uploads: a 50-page 10-K of 79,000 tokens reaches the model as a 5,500-token overview.

## How it works

1. **Overview** ([`src/excerpt.js`](src/excerpt.js)). The document's text is extracted, and only the most relevant parts go to the model (Jev, or an LLM in the benchmark). Sending less saves tokens, and it keeps the context window from bloating with pages that don't bear on the answer.
   - A short document, up to 20k tokens, is sent whole.
   - A longer one is parsed for its headings, layout and structure. The model gets the first and last 500 words, plus every heading with the first sentence under it.
   - Without three or more headings, it gets the first and last 10k tokens.

   In the demo, a 50-page 10-K of 79k tokens became a 5.5k-token overview. In the browser, [`src/pdf.js`](src/pdf.js) reads PDFs with pdf.js and marks larger type as headings. The file itself never leaves the visitor's machine.
2. **One question** ([`src/jev.js`](src/jev.js)). That text goes to `POST /v1/systemone` as `state`, with one `choice` question whose options are the 21 types plus "something else", each with a one-line definition ([`src/vocabulary.js`](src/vocabulary.js)). The response carries the choice, its confidence, a probability for every option and the input tokens used.
3. **The server** ([`api/classify.js`](api/classify.js)). A Vercel function keeps the API key server-side. It fixes the question so the endpoint can't be used as an open proxy, caps the body size, rate-limits each visitor and never logs document text.
4. **The demo** ([`index.html`](index.html)). While Jev works, the highlight wanders over the types. Once the answer is in, [`src/settle.js`](src/settle.js) replays the real probability distribution, slowing down until it lands on the choice. The keyword rules ([`src/keywords.js`](src/keywords.js)) run in the browser alongside for comparison.

## Run it

```sh
npm test                              # unit tests, Node 20+
echo 'TYPESAFE_API_KEY=…' > .env      # a key from typesafe.ai
npm run demo                          # http://localhost:8080
```

To rerun the benchmark, put `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` in `.env.bench`, `npm install` (for the bi-encoder) and run `npm run bench`. Answers are cached in `bench/cache/`, so `npm run bench -- jev` reruns only Jev.

Deploy on Vercel as-is: set `TYPESAFE_API_KEY` in the project's environment variables. Set a spend limit on the key too. The rate limiter is in memory, so each serverless instance counts on its own.

## License

MIT. See [LICENSE](LICENSE).
