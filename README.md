# Bridge Contract Simulator / 橋牌合約成約率模擬器

[繁體中文](README.zh-TW.md) | [English](README.en.md)

An installable, offline-capable bridge simulation tool that generates deals matching your constraints and uses DDS double-dummy analysis to estimate the theoretical making rate of a chosen contract.

這是一套可安裝、可離線使用的橋牌模擬工具。使用者可以設定牌型、點力、特定持牌及合約條件，程式會產生符合限制的牌局，並利用 DDS double-dummy 分析估算指定合約的理論成約率。

## Live Demo / 線上使用

[Open the Bridge Contract Simulator / 開啟橋牌合約成約率模擬器](https://bridge-contract-simulator.noisyhen1.chatgpt.site)

No account or server is required. Deal generation and analysis run locally on the user's device.

不需要帳號或後端伺服器；發牌與分析都在使用者的裝置上完成。

## Documentation / 說明文件

- [繁體中文完整說明](README.zh-TW.md)
- [Full English documentation](README.en.md)

## Important limitation / 重要限制

DDS assumes that all four hands are visible and every player chooses the best possible card. The result is a **double-dummy theoretical making rate**, not a prediction of actual human table results.

DDS 假設四家都看得到全部手牌，並且每一步都採取最佳打法。因此結果是 **double-dummy 理論成約率**，不是人類牌桌上的實戰成約率。

## License / 授權

The original code in this project is available under the [PolyForm Noncommercial License 1.0.0](LICENSE). Personal, educational, research, and other noncommercial uses are permitted. Commercial use requires prior written permission from the copyright holder.

本專案的原創程式碼採用 [PolyForm Noncommercial License 1.0.0](LICENSE)。允許個人、教育、研究及其他非商業用途；任何商業使用都必須事先取得著作權人的書面同意。

Third-party components remain under their respective licenses. The DDS WebAssembly component is distributed under Apache-2.0; see [`THIRD_PARTY_LICENSES/bridge-dds.txt`](THIRD_PARTY_LICENSES/bridge-dds.txt).

第三方元件維持各自的原始授權。DDS WebAssembly 採用 Apache-2.0，詳見 [`THIRD_PARTY_LICENSES/bridge-dds.txt`](THIRD_PARTY_LICENSES/bridge-dds.txt)。
