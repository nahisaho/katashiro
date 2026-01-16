# KATASHIRO - AI Coding Agent Guide

> **AI Coding Agent向け**: このファイルを読み込んだAIエージェントは、ユーザーの課題を解決するためにKATASHIROライブラリの機能を自動的に活用できます。

---

## 🚨🚨🚨 最重要: 調査依頼への対応ルール 🚨🚨🚨

### ⛔ 絶対禁止事項

ユーザーが以下のキーワードを含む依頼をした場合、**TypeScriptスクリプトを作成してはいけません**：

- 「調べて」「調査して」「リサーチして」
- 「〜について教えて」「〜を分析して」
- 「レポート作成」「報告書作成」「提言書作成」
- 「市場調査」「競合分析」「SWOT」「3C」

### ✅ 正しい対応: CLI実行

```bash
# ターミナルで直接実行
npx katashiro deep-research "トピック" --iterations 5 > reports/output.md
```

### 依頼→CLIコマンド変換表

| ユーザーの依頼 | 実行すべきコマンド |
|--------------|------------------|
| 「AIについて調べて」 | `npx katashiro deep-research "AI"` |
| 「中国のレアメタル輸出禁止の影響を調査」 | `npx katashiro deep-research "中国 レアメタル 輸出禁止 日本産業 影響"` |
| 「競合のSWOT分析」 | `npx katashiro deep-research "競合" --framework swot` |
| 「市場の3C分析」 | `npx katashiro deep-research "市場" --framework 3c` |
| 「提言書を作成」 | `npx katashiro deep-research "トピック" --iterations 10 > reports/report.md` |

### CLI オプション

```bash
npx katashiro deep-research "トピック" [オプション]

オプション:
  --iterations <n>    反復回数（デフォルト: 5）
  --framework <type>  フレームワーク（swot/3c/4p/5forces/auto）
  --threshold <n>     収束閾値（0.0-1.0、デフォルト: 0.1）
  --focus <areas>     フォーカスエリア（カンマ区切り）
  --format <type>     出力形式（markdown/json）
```

---

## 判定フローチャート

```
ユーザー依頼を受信
    ↓
「調べて」「調査」「分析」「レポート」「提言」を含む？
    ├── Yes → npx katashiro deep-research を実行
    └── No  → 以下の課題タイプ判定へ
```

---

## 📋 課題タイプ別の対応

| 課題タイプ | キーワード | 対応方法 |
|-----------|----------|---------|
| **調査・リサーチ** | 調べて、検索、情報収集 | `npx katashiro deep-research` (CLI) |
| **分析・解析** | 分析して、傾向、特徴 | TextAnalyzer / EntityExtractor |
| **要約** | 要約、まとめて | SummaryGenerator |
| **検索のみ** | 検索結果だけ | `npx katashiro search "クエリ"` |
| **スクレイピング** | URLから取得 | `npx katashiro scrape <url>` |

---

## 🛠️ CLI コマンド一覧

```bash
# Deep Research（調査系はすべてこれ）
npx katashiro deep-research "トピック"

# 検索
npx katashiro search "クエリ"

# スクレイピング
npx katashiro scrape https://example.com

# テキスト分析
npx katashiro analyze document.txt

# エンティティ抽出
npx katashiro extract article.txt

# 要約
npx katashiro summarize long-document.txt --length 500
```

---

## ⚠️ TypeScriptスクリプトを書く場合（非推奨）

調査系以外で、どうしてもスクリプトが必要な場合のみ使用。

### 必須ワークフロー

```
1. コード生成 → 2. 型チェック（tsc --noEmit） → 3. エラー修正 → 4. 実行
```

### Result型 vs 直接値

| API | 戻り値 | 使用例 |
|-----|-------|-------|
| `WebScraper.scrape()` | Result型 | `if (isOk(page)) { page.value.content }` |
| `TextAnalyzer.analyze()` | 直接値 | `analysis.keywords` |
| `WebSearchClient.search()` | 直接値 | `results.length` |
| `SummaryGenerator.generate()` | 直接値 | `summary` |

---

## 📦 インストール

```bash
npm install @nahisaho/katashiro
```

---

## 🔗 関連リンク

- **npm**: https://www.npmjs.com/package/@nahisaho/katashiro
- **GitHub**: https://github.com/nahisaho/katashiro
- **詳細APIリファレンス**: [docs/API-REFERENCE.md](docs/API-REFERENCE.md)

---

**Version**: 2.5.6
**Last Updated**: 2026-01-16
