# Release Notes: KATASHIRO v0.2.0

🎉 **KATASHIRO v0.2.0** がリリースされました！

このリリースでは、**透明性機能**と**ワークフロー自動化機能**という2つの大きな新機能を追加しました。

## 🔍 透明性機能 (Phase 2)

AI生成コンテンツの透明性を確保し、人間とAIの協調作業を可視化する機能群です。

### 新しいクラス

| クラス | 説明 |
|--------|------|
| `ContributionAnalyzer` | AI/人間の貢献を識別・分析 |
| `CollaborationTracker` | 共同作業セッション追跡 |
| `VersioningManager` | バージョン管理・履歴追跡 |
| `TransparencyReport` | 透明性レポート生成 |

### 使用例

```typescript
import { 
  ContributionAnalyzer, 
  CollaborationTracker,
  TransparencyReport 
} from '@nahisaho/katashiro';

// AI貢献度を分析
const analyzer = new ContributionAnalyzer();
const result = await analyzer.analyze(content);
console.log(`AI貢献度: ${result.aiRatio * 100}%`);

// 共同作業を追跡
const tracker = new CollaborationTracker();
const session = tracker.startSession('doc-001', 'My Document', {
  name: 'Author',
  type: 'human'
});
```

## ⚙️ ワークフロー自動化機能 (Phase 3)

情報収集→分析→生成→検証の一連のプロセスを自動化する機能群です。

### 新しいクラス

| クラス | 説明 |
|--------|------|
| `WorkflowEngine` | ステップベースのワークフロー実行 |
| `QualityGate` | 品質ゲート評価 |
| `StyleGuideEnforcer` | スタイルガイド適用 |
| `PipelineOrchestrator` | パイプライン統合管理 |

### 使用例

```typescript
import { 
  WorkflowEngine, 
  QualityGate,
  StyleGuideEnforcer 
} from '@nahisaho/katashiro';

// ワークフロー実行
const engine = new WorkflowEngine();
engine.loadDefinition({
  id: 'my-workflow',
  name: 'Research Pipeline',
  version: '1.0.0',
  steps: [
    { id: 'analyze', name: 'Analyze', type: 'analyze', execute: async (input) => { ... } },
    { id: 'generate', name: 'Generate', type: 'generate', execute: async (input) => { ... } }
  ]
});
const result = await engine.execute({ content: 'input text' });

// 品質チェック
const qualityGate = new QualityGate();
const quality = await qualityGate.evaluate(content);
console.log(`品質スコア: ${quality.overallScore}/100`);
```

## 📊 テストカバレッジ

| 項目 | v0.1.x | v0.2.0 |
|------|--------|--------|
| テストファイル数 | 41 | 49 |
| テスト数 | 448 | 618 |
| 透明性機能テスト | - | 32 |
| ワークフロー機能テスト | - | 43 |
| 統合テスト | - | 14 |
| E2Eテスト | - | 7 |

## 🔧 その他の改善

### API改善
- `CitationGenerator.generate()`: `GeneratedCitation`オブジェクトを返すように変更
- `CitationGenerator.validate()`: 引用入力のバリデーション機能を追加

### ドキュメント
- CHANGELOG.md を追加
- README.md に新機能の使用例を追加

## ⬆️ アップグレード方法

```bash
npm update @nahisaho/katashiro
```

## 📝 Breaking Changes

- なし（後方互換性を維持）

## 📚 関連リンク

- [ユーザーガイド](docs/USER-GUIDE.md)
- [CHANGELOG](CHANGELOG.md)
- [GitHub](https://github.com/nahisaho/katashiro)
- [npm](https://www.npmjs.com/package/@nahisaho/katashiro)

---

**作者**: [@nahisaho](https://github.com/nahisaho)
**ライセンス**: MIT
