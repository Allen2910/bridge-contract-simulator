# Bridge Contract Simulator

[繁體中文](README.zh-TW.md) | [Back to the bilingual overview](README.md)

Bridge Contract Simulator is an installable, offline-capable web application. It generates deals that match user-defined North/South hand constraints and uses DDS double-dummy analysis to estimate the theoretical making rate of a selected contract.

## Live demo

[Open the Bridge Contract Simulator](https://bridge-contract-simulator.noisyhen1.chatgpt.site)

No account is required. Deal generation, constraint filtering, DDS analysis, and statistics run locally on the user's device; deal data is not uploaded to a server. After the first successful load, the application can be installed on a phone or computer and used offline.

## Who is this for?

- **Established partnerships and competitive players** who want to test disagreements about system ranges, invitations, and game decisions.
- **Bridge coaches** who want to build teaching examples with specific HCP, shapes, fits, and contract outcomes.
- **Bidding-system designers** who want to study how different ranges, shapes, or fit requirements affect contract results.
- **School and local bridge clubs** that want to turn statements such as “this usually makes game” into repeatable simulations and measurable results.
- **Advanced learners** studying the theoretical performance of 3NT, major-suit games, slams, and other contracts under specified conditions.
- **Developers and researchers** interested in constrained deal generation, Monte Carlo simulation, and DDS applications.

The tool is especially useful for asking: “If the hands described by our system really look like this, how often does the selected contract make under optimal double-dummy play?” It is not a bidding teacher and does not declare that any call is always correct.

## Features

- North and South HCP ranges.
- Suit-independent shapes such as `4333,4432,5332`.
- Full or partial `S-H-D-C` suit lengths, such as `5-4-2-2` or `5-?-?-?`.
- One or more specific suit patterns, such as `S=AKQJ10xxx,H=Axxxx`.
- At-least-one-singleton and at-least-one-void constraints.
- Combined North/South HCP range.
- Minimum and maximum North/South trump fit.
- East/West trump splits such as `3-1,2-2`.
- Individual HCP caps for East and West.
- Fixed North/South hands with only the unknown East/West cards randomized.
- Contract level, strain, declarer, and random seed selection.
- Automatic sample sizing by a target 95% margin of error, or manual sample entry.
- Making rate, 95% Wilson confidence interval, average tricks, and full trick distribution.
- Representative made and failed deals with all four hands, HCP, shape, and suit holdings.
- Traditional Chinese and English interfaces with a remembered language preference.

## How to use it

1. Select constraint mode or fixed North/South hands.
2. Enter the North/South HCP ranges, shapes, and any additional constraints.
3. Select the contract and declarer to analyze.
4. Choose a target margin of error or enter the number of valid deals manually.
5. Run the simulation and review the making rate, charts, and example deals.

Fixed hands use PBN `S.H.D.C` order. For example:

```text
AKQJ.T98.765.432
```

This means spades `AKQJ`, hearts `T98`, diamonds `765`, and clubs `432`. Leave a section empty for a void, for example `AKQJT.9876.432.`.

## Specific suit patterns

```text
S=AKQJ10xxx
S=AKQJ10xxx,H=Axxxx
```

- `S/H/D/C` stand for spades, hearts, diamonds, and clubs.
- Both `10` and `T` represent the ten.
- Each `x` represents a different card other than A/K/Q/J.
- The pattern fixes the total suit length; `S=AKQJ10xxx` means exactly eight spades.
- Any A/K/Q/J not explicitly listed is excluded from that suit.
- Separate multiple suit constraints with commas.

## Interpreting the results

The sample count is the number of valid deals that matched every constraint and completed DDS analysis. Narrow conditions may require many candidate deals to produce one valid deal.

When the making rate is near 50%, the conservative approximate 95% margins of error are:

| Valid deals | Approximate margin |
| ---: | ---: |
| 385 | ±5.0% |
| 1,068 | ±3.0% |
| 2,401 | ±2.0% |
| 9,604 | ±1.0% |

The same constraints, sample count, and random seed reproduce the same deals for review and discussion.

## Important limitation

DDS performs double-dummy analysis: all four hands are assumed to be visible, and every player is assumed to choose the best possible card. The result is therefore a **DDS theoretical making rate**, not a prediction of actual human table performance.

The results are most useful for comparisons, such as comparing 3NT and 4♠ under the same hand constraints. They should not be used alone to claim that a system will achieve the same success rate in human competition. Input assumptions directly affect the result, so shared analyses should include the complete constraints, sample size, and random seed.

## Installation and offline use

- Android/Chrome: open the site and select “Install app.”
- iPhone/Safari: tap Share and select “Add to Home Screen.”
- Desktop browsers: use the install option in the address bar or browser menu when supported.

The first visit requires a network connection to download the interface and DDS WebAssembly. Once cached, the application can run offline.

## Local preview

`dist/` is a ready-to-deploy static site. It does not require a Node.js build or backend API.

From this repository directory, run:

```powershell
python -m http.server 8765 --directory dist
```

Then open `http://localhost:8765`. Do not open `index.html` directly: the Service Worker and JavaScript modules must be loaded through HTTP or HTTPS.

## Deployment

Deploy the contents of `dist/` to GitHub Pages or another HTTPS static host. No backend server is required.

## Feedback and bug reports

After the repository is published on GitHub, use Issues to report:

- Conditions that never produce a valid deal.
- Unclear inputs or translations.
- Results that cannot be reproduced.
- Mobile or browser compatibility problems.
- Requests for additional constraints or statistics.

Please include the constraints, contract, sample count, random seed, device, and browser version.

## License

The original code in this project is available under the [PolyForm Noncommercial License 1.0.0](LICENSE):

- Personal, educational, research, and other noncommercial uses are permitted.
- Modification and redistribution are permitted for noncommercial purposes.
- Commercial use requires prior written permission from the copyright holder.

This is a source-available license, not an OSI-approved open-source license. Third-party components remain under their respective licenses. The DDS WebAssembly component is distributed under Apache-2.0; see [`THIRD_PARTY_LICENSES/bridge-dds.txt`](THIRD_PARTY_LICENSES/bridge-dds.txt).
