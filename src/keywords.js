// The legacy baseline: hand-written keyword rules, the way document routing is often done today.
// Each type has weighted patterns; the type with the highest total wins, and nothing matching means
// `other`. Instant and free, but it reads words, not documents: a 10-Q that mentions the 10-K, or an
// 8-K that attaches an earnings release, fools it.

/** @type {Record<string, [RegExp, number][]>} */
export const RULES = {
  annual_report_10k: [[/form\s+10-?k\b/gi, 3], [/annual report/gi, 2], [/fiscal year ended/gi, 1], [/item\s+1a\.?\s+risk factors/gi, 1], [/item\s+7\.?\s+management/gi, 1]],
  quarterly_report_10q: [[/form\s+10-?q\b/gi, 3], [/quarterly report/gi, 2], [/quarterly period ended/gi, 2], [/unaudited/gi, 1]],
  current_report_8k: [[/form\s+8-?k\b/gi, 3], [/current report/gi, 2], [/item\s+\d\.\d\d/gi, 1], [/date of report/gi, 1]],
  proxy_statement: [[/proxy statement/gi, 3], [/schedule\s+14a/gi, 3], [/annual meeting/gi, 1], [/vote/gi, 0.5], [/nominees?/gi, 1]],
  registration_statement: [[/form\s+s-?1\b/gi, 3], [/registration statement/gi, 3], [/initial public offering/gi, 2], [/use of proceeds/gi, 1], [/dilution/gi, 1], [/underwrit/gi, 1]],
  fund_prospectus: [[/prospectus/gi, 2], [/investment objective/gi, 2], [/fees and expenses/gi, 2], [/principal (investment )?(strategies|risks)/gi, 1], [/share class/gi, 1]],
  fund_fact_sheet: [[/fact sheet/gi, 3], [/top (ten |10 )?holdings/gi, 2], [/expense ratio/gi, 1], [/sector (weights|allocation)/gi, 1], [/as of/gi, 0.5]],
  fund_shareholder_report: [[/(semi-?)?annual report to shareholders/gi, 3], [/shareholder report/gi, 3], [/schedule of investments/gi, 2], [/statement of assets and liabilities/gi, 2]],
  earnings_release: [[/press release/gi, 2], [/reports? (first|second|third|fourth)[- ]quarter/gi, 3], [/(quarter|fiscal year) (results|financial results)/gi, 2], [/guidance/gi, 1], [/earnings per share/gi, 1]],
  earnings_call_transcript: [[/operator/gi, 2], [/conference call/gi, 2], [/question-and-answer|q&a/gi, 2], [/analyst/gi, 1], [/thank you/gi, 0.5]],
  investor_presentation: [[/investor (presentation|day)/gi, 3], [/forward-looking statements/gi, 1], [/slide/gi, 1], [/agenda/gi, 1]],
  shareholder_letter: [[/dear (fellow )?(shareholders|stockholders|owners)/gi, 4], [/letter to shareholders/gi, 3], [/sincerely/gi, 1]],
  insider_transaction_form4: [[/form\s+4\b/gi, 3], [/changes in beneficial ownership/gi, 3], [/reporting person/gi, 2], [/transaction code/gi, 1]],
  institutional_holdings_13f: [[/form\s+13f/gi, 4], [/information table/gi, 2], [/voting authority/gi, 2], [/cusip/gi, 0.5], [/investment discretion/gi, 1]],
  beneficial_ownership_13d: [[/schedule\s+13[dg]\b/gi, 4], [/percent of class/gi, 2], [/beneficially owned/gi, 1], [/purpose of (the )?transaction/gi, 2]],
  equity_research_report: [[/price target/gi, 3], [/(rating|recommendation):?\s*(buy|hold|sell|overweight|underweight|outperform)/gi, 3], [/analyst certification/gi, 2], [/estimates?/gi, 0.5], [/valuation/gi, 0.5]],
  credit_rating_report: [[/rating (action|rationale)/gi, 3], [/outlook (is )?(stable|positive|negative)/gi, 2], [/(affirms?|upgrades?|downgrades?)/gi, 1], [/what could change the rating/gi, 3], [/credit rating/gi, 1]],
  brokerage_statement: [[/account (statement|summary)/gi, 2], [/statement period/gi, 3], [/(beginning|ending) (account )?value/gi, 2], [/holdings/gi, 0.5], [/account number/gi, 1]],
  trade_confirmation: [[/confirmation/gi, 3], [/trade date/gi, 2], [/settlement date/gi, 2], [/(we|you) (bought|sold)/gi, 2], [/net amount/gi, 1], [/commission/gi, 1]],
  bond_official_statement: [[/official statement/gi, 4], [/maturity schedule/gi, 2], [/(revenue|general obligation) bonds/gi, 2], [/bond counsel/gi, 2], [/tax-exempt/gi, 1]],
};

/**
 * Scores every type by its keyword hits (each pattern counts at most 3 times).
 * @param {string} text
 * @returns {{ type: string, ranked: { code: string, score: number }[] }}
 */
export function classifyByKeywords(text) {
  const ranked = Object.entries(RULES).map(([code, rules]) => ({
    code,
    score: rules.reduce((sum, [re, w]) => sum + w * Math.min(3, (text.match(re) || []).length), 0),
  })).sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
  return { type: ranked[0].score > 0 ? ranked[0].code : 'other', ranked };
}
