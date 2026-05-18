# Subscription Receipt PDFs

## Downloaded automatically (7 PDFs)
These were fetched directly from Stripe signed URLs in the emails:

| File | Service | Date | Amount |
|---|---|---|---|
| Anthropic_2026-04-15.pdf | Anthropic | Apr 15 2026 | €46.28 |
| Anthropic_2026-04-08.pdf | Anthropic | Apr 8 2026 | €46.28 |
| Anthropic_2026-04-06.pdf | Anthropic | Apr 6 2026 | €21.78 (Claude Pro) |
| Anthropic_2026-04-02a.pdf | Anthropic | Apr 2 2026 | €24.20 |
| Anthropic_2026-04-02b.pdf | Anthropic | Apr 2 2026 | €24.20 |
| Anthropic_2026-04-01.pdf | Anthropic | Apr 1 2026 | €24.20 |
| Anthropic_2026-03-31.pdf | Anthropic | Mar 31 2026 | €6.05 |

## Still needed (9 PDFs) — Stripe URLs expired after 30 days
Download manually from Gmail. Each email has a PDF attachment.

### To get these quickly:
1. Open Gmail → search: `from:invoice+statements@mail.anthropic.com OR from:stripe.com`
2. Open each email below → click the PDF attachment icon → Download
3. Rename and place here following the naming pattern: `{Service}_{YYYY-MM-DD}.pdf`

| File to create | Gmail search | Date | Amount |
|---|---|---|---|
| Anthropic_2026-03-23.pdf | subject:"2322-5147-9107" | Mar 23 2026 | €6.05 |
| Anthropic_2026-03-06.pdf | subject:"2975-9840-3921" | Mar 6 2026 | €21.78 |
| Windsurf_2026-03-04.pdf | subject:"2421-4789" | Mar 4 2026 | $16.22 |
| Windsurf_2026-02-04.pdf | subject:"2478-2713" | Feb 4 2026 | $16.22 |
| Windsurf_2026-01-04.pdf | subject:"2264-7801" | Jan 4 2026 | $16.22 |
| Windsurf_2025-12-04.pdf | subject:"2576-4678" | Dec 4 2025 | $16.22 |
| Windsurf_2025-11-04.pdf | subject:"2762-2564" | Nov 4 2025 | $16.22 |
| Windsurf_2025-10-04.pdf | subject:"2049-1914" | Oct 4 2025 | $16.22 |
| Windsurf_2025-09-04.pdf | subject:"2881-7261" | Sep 4 2025 | $16.22 |

## Not available via email (need manual download from account dashboard)
- **Posit Connect Cloud** (6 months × $19): PDFs are email attachments — download from Gmail (`from:noreply@posit.cloud subject:"Payment received"`) OR from https://connect.posit.cloud → account → billing history
- **ChatGPT/OpenAI** (16 months × $21.63): No email receipts — download from https://platform.openai.com/account/billing → invoice history
