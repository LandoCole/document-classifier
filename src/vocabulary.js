// The document types the classifier chooses between: public-markets and SEC documents.
// Each definition is what the model reads, so it says what sets the type apart from its neighbours.

/** @typedef {{ code: string, label: string, definition: string }} DocumentType */

/** @type {DocumentType[]} */
export const TYPES = [
  { code: 'annual_report_10k', label: 'Annual report (10-K)',
    definition: "A public company's annual report filed with the SEC on Form 10-K: business description, risk factors, MD&A and audited full-year financial statements." },
  { code: 'quarterly_report_10q', label: 'Quarterly report (10-Q)',
    definition: "A public company's quarterly report filed with the SEC on Form 10-Q: unaudited interim financial statements and MD&A for a fiscal quarter." },
  { code: 'current_report_8k', label: 'Current report (8-K)',
    definition: 'An SEC Form 8-K cover filing that reports a material event under numbered items (for example Item 2.02, 5.02 or 8.01), often attaching exhibits.' },
  { code: 'proxy_statement', label: 'Proxy statement',
    definition: "A proxy statement (Schedule 14A) for a shareholder meeting: proposals to vote on, director nominees, executive compensation and voting instructions." },
  { code: 'registration_statement', label: 'Registration statement (S-1)',
    definition: 'A registration statement for a new securities offering, such as an IPO on Form S-1: the offering, use of proceeds, dilution, risk factors and underwriting.' },
  { code: 'fund_prospectus', label: 'Fund prospectus',
    definition: "A mutual fund or ETF prospectus: the fund's investment objective, fees and expenses table, principal strategies and risks, and how to buy and sell shares." },
  { code: 'fund_fact_sheet', label: 'Fund fact sheet',
    definition: "A short marketing summary of a fund, usually one or two pages: performance as of a date, top holdings, sector weights, expense ratio and key facts." },
  { code: 'fund_shareholder_report', label: 'Fund shareholder report',
    definition: "A fund's annual or semi-annual report to its shareholders: performance discussion, schedule of investments and the fund's financial statements." },
  { code: 'earnings_release', label: 'Earnings press release',
    definition: "A company's press release announcing quarterly or annual results, with headline figures, management quotes, guidance and summary financial tables." },
  { code: 'earnings_call_transcript', label: 'Earnings call transcript',
    definition: "A transcript of a company's earnings conference call: an operator, prepared remarks by executives, then analysts' questions and answers." },
  { code: 'investor_presentation', label: 'Investor presentation',
    definition: 'A slide deck for investors: short bullet points and charts on strategy, market opportunity and results, with a forward-looking statements slide.' },
  { code: 'shareholder_letter', label: 'Letter to shareholders',
    definition: "A letter from a company's chief executive or chair to its shareholders, in the first person, reflecting on the year and the company's direction." },
  { code: 'insider_transaction_form4', label: 'Insider transaction (Form 4)',
    definition: 'An SEC Form 4 reporting a change in an insider\'s holdings: the reporting person, their relationship to the issuer and a table of transactions with codes, shares and prices.' },
  { code: 'institutional_holdings_13f', label: 'Institutional holdings (13F)',
    definition: "An investment manager's Form 13F holdings report: a table of positions by issuer, CUSIP, value, shares and voting authority at quarter end." },
  { code: 'beneficial_ownership_13d', label: 'Beneficial ownership (13D/13G)',
    definition: "A Schedule 13D or 13G disclosing that a person or group owns more than 5% of a company's shares, with the percent of class and, for a 13D, the purpose of the transaction." },
  { code: 'equity_research_report', label: 'Equity research report',
    definition: "An analyst's research note on a stock: a rating such as buy or hold, a price target, estimates, valuation and the investment thesis, with analyst disclosures." },
  { code: 'credit_rating_report', label: 'Credit rating report',
    definition: "A rating agency's report assigning or affirming a credit rating and outlook to an issuer or debt, with the rating rationale and what could change the rating." },
  { code: 'brokerage_statement', label: 'Brokerage account statement',
    definition: "A periodic statement of an investor's brokerage account: account value, holdings, activity, income and cash balance for the statement period." },
  { code: 'trade_confirmation', label: 'Trade confirmation',
    definition: 'A confirmation of a single executed trade sent to the customer: buy or sell, security, quantity, price, trade and settlement dates, commission and net amount.' },
  { code: 'bond_official_statement', label: 'Bond official statement',
    definition: 'An official statement or offering memorandum for a municipal or corporate bond issue: maturity schedule, interest rates, security for the bonds and the issuer\'s finances.' },
];

/** The answer when the document is none of the types above. */
export const OTHER = { code: 'other', label: 'Something else',
  definition: 'None of these: not one of the financial document types listed, or not a financial document at all.' };

export const ALL_TYPES = [...TYPES, OTHER];

const BY_CODE = new Map(ALL_TYPES.map(t => [t.code, t]));
/** The label for a type code, or the code itself when it isn't in the vocabulary. */
export const labelFor = code => BY_CODE.get(code)?.label ?? code;
