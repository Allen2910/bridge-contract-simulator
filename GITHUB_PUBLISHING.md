# GitHub 發布指南 / GitHub Publishing Guide

## 建議方式

請使用 `bridge-contract-simulator-github.zip` 內的乾淨版本建立 GitHub repository。這個版本已排除 Sites 專用的 `.openai/` 資料與本機 `.git/` 歷史。

1. 在 GitHub 建立新的空白 repository。
2. License 選擇 **No license**，不要讓 GitHub 自動新增 README、`.gitignore` 或 License。
3. 解壓縮 ZIP，確認 `LICENSE` 第一行的著作權姓名正確。
4. 在解壓縮後的資料夾執行：

```powershell
git init
git add .
git commit -m "Initial public release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bridge-contract-simulator.git
git push -u origin main
```

請將 `YOUR_USERNAME` 與 repository 名稱換成實際值。

## 應該上傳

- `dist/`：完整離線 PWA 與 DDS WebAssembly 執行檔
- `README.md`、`README.zh-TW.md`、`README.en.md`
- `LICENSE`
- `THIRD_PARTY_LICENSES/`
- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/`
- `.gitignore`
- `GITHUB_PUBLISHING.md`

## 不應該上傳

- `.git/`：本機版本控制資料
- `.openai/`：Sites 專案識別與部署設定
- ZIP 壓縮檔、暫存資料夾與作業系統產生的隱藏檔
- Python 虛擬環境、快取、編輯器個人設定

## License 注意事項

專案原創程式碼採用 PolyForm Noncommercial License 1.0.0，禁止未經書面許可的商業用途。這是 source-available 授權，不是 OSI 定義的開源授權。DDS 等第三方元件仍依其各自授權散布。

---

## Recommended workflow

Create the GitHub repository from the clean contents of `bridge-contract-simulator-github.zip`. The package excludes the Sites-specific `.openai/` directory and local `.git/` history.

1. Create a new empty repository on GitHub.
2. Select **No license** and do not ask GitHub to generate a README, `.gitignore`, or license file.
3. Extract the ZIP and verify the copyright name on the first line of `LICENSE`.
4. Run the PowerShell commands shown above from the extracted directory.

The original project code uses the PolyForm Noncommercial License 1.0.0. It is source-available rather than OSI-approved open source. Third-party components retain their respective licenses.
