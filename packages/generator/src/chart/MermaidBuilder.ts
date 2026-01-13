/**
 * Mermaid Builder
 * Mermaidダイアグラムを生成するユーティリティ
 * REQ-MEDIA-002-002: ダイアグラム生成
 * REQ-EXT-VIS-002: フローチャート生成
 */

import type { DiagramOptions, DiagramType } from './types.js';

/**
 * プロセスステップ（REQ-EXT-VIS-002）
 */
export interface ProcessStep {
  /** ステップID（自動生成可） */
  id?: string;
  /** ステップ名/ラベル */
  label: string;
  /** ステップタイプ */
  type?: 'start' | 'end' | 'process' | 'decision' | 'input' | 'output' | 'subprocess';
  /** 次のステップID（単一または条件付き） */
  next?: string | Array<{ condition: string; stepId: string }>;
  /** 説明 */
  description?: string;
}

/**
 * プロセス定義（REQ-EXT-VIS-002）
 */
export interface ProcessDefinition {
  /** プロセス名 */
  name?: string;
  /** ステップ一覧 */
  steps: ProcessStep[];
  /** 方向 */
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
}

/**
 * プロセスフローチャート生成結果（REQ-EXT-VIS-002）
 */
export interface ProcessFlowchartResult {
  /** Mermaid構文 */
  mermaid: string;
  /** SVG（生成された場合） */
  svg?: string;
  /** ノード数 */
  nodeCount: number;
  /** エッジ数 */
  edgeCount: number;
  /** 警告メッセージ */
  warnings: string[];
}

/**
 * フローチャートノード
 */
export interface FlowchartNode {
  /** ノードID */
  id: string;
  /** ラベル */
  label: string;
  /** 形状 */
  shape?: 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'hexagon' | 'parallelogram';
  /** スタイル */
  style?: string;
}

/**
 * フローチャートエッジ
 */
export interface FlowchartEdge {
  /** 開始ノードID */
  from: string;
  /** 終了ノードID */
  to: string;
  /** ラベル */
  label?: string;
  /** スタイル */
  style?: 'solid' | 'dashed' | 'dotted' | 'thick';
  /** 矢印タイプ */
  arrow?: 'arrow' | 'open' | 'circle' | 'cross';
}

/**
 * フローチャートデータ
 */
export interface FlowchartData {
  /** ノード */
  nodes: FlowchartNode[];
  /** エッジ */
  edges: FlowchartEdge[];
  /** サブグラフ */
  subgraphs?: Array<{
    id: string;
    label: string;
    nodes: string[];
  }>;
}

/**
 * シーケンス図参加者
 */
export interface SequenceParticipant {
  /** ID */
  id: string;
  /** 表示名 */
  name: string;
  /** タイプ */
  type?: 'participant' | 'actor';
}

/**
 * シーケンス図メッセージ
 */
export interface SequenceMessage {
  /** 送信者ID */
  from: string;
  /** 受信者ID */
  to: string;
  /** メッセージ */
  message: string;
  /** タイプ */
  type?: 'solid' | 'dotted' | 'async' | 'reply';
  /** ノート */
  note?: { position: 'left' | 'right' | 'over'; text: string };
}

/**
 * シーケンス図データ
 */
export interface SequenceData {
  /** 参加者 */
  participants: SequenceParticipant[];
  /** メッセージ */
  messages: SequenceMessage[];
  /** ループ */
  loops?: Array<{ label: string; messages: SequenceMessage[] }>;
  /** 条件分岐 */
  alternatives?: Array<{
    conditions: Array<{ label: string; messages: SequenceMessage[] }>;
  }>;
}

/**
 * クラス図クラス
 */
export interface ClassDefinition {
  /** クラス名 */
  name: string;
  /** 属性 */
  attributes?: Array<{ name: string; type: string; visibility?: '+' | '-' | '#' | '~' }>;
  /** メソッド */
  methods?: Array<{
    name: string;
    returnType: string;
    parameters?: string[];
    visibility?: '+' | '-' | '#' | '~';
  }>;
  /** アノテーション */
  annotation?: 'interface' | 'abstract' | 'enum';
}

/**
 * クラス図関係
 */
export interface ClassRelation {
  /** 開始クラス */
  from: string;
  /** 終了クラス */
  to: string;
  /** 関係タイプ */
  type: 'inheritance' | 'composition' | 'aggregation' | 'association' | 'dependency' | 'realization';
  /** ラベル */
  label?: string;
  /** カーディナリティ */
  cardinality?: { from?: string; to?: string };
}

/**
 * クラス図データ
 */
export interface ClassDiagramData {
  /** クラス */
  classes: ClassDefinition[];
  /** 関係 */
  relations: ClassRelation[];
}

/**
 * ガントチャートタスク
 */
export interface GanttTask {
  /** タスクID */
  id: string;
  /** タスク名 */
  name: string;
  /** セクション */
  section?: string;
  /** 開始日 */
  start: string;
  /** 終了日または期間 */
  end: string;
  /** 依存タスク */
  after?: string;
  /** 状態 */
  status?: 'done' | 'active' | 'crit';
}

/**
 * ガントチャートデータ
 */
export interface GanttData {
  /** タイトル */
  title?: string;
  /** 日付フォーマット */
  dateFormat?: string;
  /** タスク */
  tasks: GanttTask[];
  /** セクション */
  sections?: string[];
}

/**
 * Mermaidビルダークラス
 */
export class MermaidBuilder {
  /**
   * フローチャートを生成
   */
  buildFlowchart(
    data: FlowchartData,
    options?: DiagramOptions
  ): string {
    const direction = options?.direction ?? 'TB';
    const lines: string[] = [`flowchart ${direction}`];

    // サブグラフ
    if (data.subgraphs) {
      for (const subgraph of data.subgraphs) {
        lines.push(`  subgraph ${subgraph.id}["${subgraph.label}"]`);
        for (const nodeId of subgraph.nodes) {
          const node = data.nodes.find(n => n.id === nodeId);
          if (node) {
            lines.push(`    ${this.formatNode(node)}`);
          }
        }
        lines.push('  end');
      }
    }

    // ノード（サブグラフ外）
    const subgraphNodeIds = new Set(
      data.subgraphs?.flatMap(s => s.nodes) ?? []
    );
    for (const node of data.nodes) {
      if (!subgraphNodeIds.has(node.id)) {
        lines.push(`  ${this.formatNode(node)}`);
      }
    }

    // エッジ
    for (const edge of data.edges) {
      lines.push(`  ${this.formatEdge(edge)}`);
    }

    return lines.join('\n');
  }

  /**
   * シーケンス図を生成
   */
  buildSequenceDiagram(data: SequenceData, _options?: DiagramOptions): string {
    const lines: string[] = ['sequenceDiagram'];

    // 参加者
    for (const participant of data.participants) {
      const type = participant.type ?? 'participant';
      lines.push(`  ${type} ${participant.id} as ${participant.name}`);
    }

    // メッセージ
    for (const msg of data.messages) {
      const arrow = this.getSequenceArrow(msg.type);
      lines.push(`  ${msg.from}${arrow}${msg.to}: ${msg.message}`);

      if (msg.note) {
        const position =
          msg.note.position === 'over'
            ? `over ${msg.from}`
            : `${msg.note.position} of ${msg.from}`;
        lines.push(`  Note ${position}: ${msg.note.text}`);
      }
    }

    // ループ
    if (data.loops) {
      for (const loop of data.loops) {
        lines.push(`  loop ${loop.label}`);
        for (const msg of loop.messages) {
          const arrow = this.getSequenceArrow(msg.type);
          lines.push(`    ${msg.from}${arrow}${msg.to}: ${msg.message}`);
        }
        lines.push('  end');
      }
    }

    // 条件分岐
    if (data.alternatives) {
      for (const alt of data.alternatives) {
        alt.conditions.forEach((cond, i) => {
          if (i === 0) {
            lines.push(`  alt ${cond.label}`);
          } else {
            lines.push(`  else ${cond.label}`);
          }
          for (const msg of cond.messages) {
            const arrow = this.getSequenceArrow(msg.type);
            lines.push(`    ${msg.from}${arrow}${msg.to}: ${msg.message}`);
          }
        });
        lines.push('  end');
      }
    }

    return lines.join('\n');
  }

  /**
   * クラス図を生成
   */
  buildClassDiagram(data: ClassDiagramData, _options?: DiagramOptions): string {
    const lines: string[] = ['classDiagram'];

    // クラス
    for (const cls of data.classes) {
      if (cls.annotation) {
        lines.push(`  <<${cls.annotation}>> ${cls.name}`);
      }

      lines.push(`  class ${cls.name} {`);

      // 属性
      if (cls.attributes) {
        for (const attr of cls.attributes) {
          const visibility = attr.visibility ?? '+';
          lines.push(`    ${visibility}${attr.type} ${attr.name}`);
        }
      }

      // メソッド
      if (cls.methods) {
        for (const method of cls.methods) {
          const visibility = method.visibility ?? '+';
          const params = method.parameters?.join(', ') ?? '';
          lines.push(
            `    ${visibility}${method.name}(${params}) ${method.returnType}`
          );
        }
      }

      lines.push('  }');
    }

    // 関係
    for (const rel of data.relations) {
      const arrow = this.getClassRelationArrow(rel.type);
      let line = `  ${rel.from} ${arrow} ${rel.to}`;
      if (rel.label) {
        line += ` : ${rel.label}`;
      }
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * 状態図を生成
   */
  buildStateDiagram(
    states: Array<{ id: string; label?: string; type?: 'start' | 'end' | 'choice' | 'fork' | 'join' }>,
    transitions: Array<{ from: string; to: string; label?: string }>,
    _options?: DiagramOptions
  ): string {
    const lines: string[] = ['stateDiagram-v2'];

    // 状態
    for (const state of states) {
      if (state.type === 'start') {
        lines.push(`  [*] --> ${state.id}`);
      } else if (state.type === 'end') {
        // 終了状態は遷移で表現
      } else if (state.type === 'choice') {
        lines.push(`  state ${state.id} <<choice>>`);
      } else if (state.type === 'fork' || state.type === 'join') {
        lines.push(`  state ${state.id} <<${state.type}>>`);
      } else if (state.label && state.label !== state.id) {
        lines.push(`  ${state.id} : ${state.label}`);
      }
    }

    // 遷移
    for (const trans of transitions) {
      const endState = states.find(s => s.id === trans.to);
      const target = endState?.type === 'end' ? '[*]' : trans.to;
      let line = `  ${trans.from} --> ${target}`;
      if (trans.label) {
        line += ` : ${trans.label}`;
      }
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * ER図を生成
   */
  buildErDiagram(
    entities: Array<{ name: string; attributes: Array<{ name: string; type: string; key?: 'PK' | 'FK' | 'UK' }> }>,
    relationships: Array<{
      from: string;
      to: string;
      relation: string;
      fromCardinality: '|o' | '||' | '}o' | '}|';
      toCardinality: 'o|' | '||' | 'o{' | '|{';
    }>,
    _options?: DiagramOptions
  ): string {
    const lines: string[] = ['erDiagram'];

    // エンティティ
    for (const entity of entities) {
      lines.push(`  ${entity.name} {`);
      for (const attr of entity.attributes) {
        const key = attr.key ? ` ${attr.key}` : '';
        lines.push(`    ${attr.type} ${attr.name}${key}`);
      }
      lines.push('  }');
    }

    // 関係
    for (const rel of relationships) {
      lines.push(
        `  ${rel.from} ${rel.fromCardinality}--${rel.toCardinality} ${rel.to} : "${rel.relation}"`
      );
    }

    return lines.join('\n');
  }

  /**
   * ガントチャートを生成
   */
  buildGanttChart(data: GanttData, _options?: DiagramOptions): string {
    const lines: string[] = ['gantt'];

    if (data.title) {
      lines.push(`  title ${data.title}`);
    }

    lines.push(`  dateFormat ${data.dateFormat ?? 'YYYY-MM-DD'}`);

    // セクションごとにタスクをグループ化
    const sections = new Map<string, GanttTask[]>();
    for (const task of data.tasks) {
      const section = task.section ?? 'Default';
      if (!sections.has(section)) {
        sections.set(section, []);
      }
      sections.get(section)!.push(task);
    }

    // 出力
    for (const [section, tasks] of sections) {
      if (section !== 'Default' || sections.size > 1) {
        lines.push(`  section ${section}`);
      }
      for (const task of tasks) {
        let line = `  ${task.name} :`;
        if (task.status) {
          line += task.status + ', ';
        }
        line += `${task.id}, `;
        if (task.after) {
          line += `after ${task.after}, `;
        } else {
          line += `${task.start}, `;
        }
        line += task.end;
        lines.push(line);
      }
    }

    return lines.join('\n');
  }

  /**
   * パイチャートを生成
   */
  buildPieChart(
    data: Array<{ label: string; value: number }>,
    options?: DiagramOptions
  ): string {
    const lines: string[] = ['pie'];

    if (options?.title) {
      lines.push(`  title ${options.title}`);
    }

    for (const item of data) {
      lines.push(`  "${item.label}" : ${item.value}`);
    }

    return lines.join('\n');
  }

  /**
   * マインドマップを生成
   */
  buildMindmap(
    root: string,
    children: Array<{ text: string; children?: Array<{ text: string; children?: Array<{ text: string }> }> }>,
    _options?: DiagramOptions
  ): string {
    const lines: string[] = ['mindmap'];
    lines.push(`  root((${root}))`);

    const addChildren = (
      items: Array<{ text: string; children?: Array<{ text: string; children?: Array<{ text: string }> }> }>,
      indent: number
    ): void => {
      for (const item of items) {
        lines.push(`${'  '.repeat(indent)}${item.text}`);
        if (item.children) {
          addChildren(item.children, indent + 1);
        }
      }
    };

    addChildren(children, 2);

    return lines.join('\n');
  }

  /**
   * タイムラインを生成
   */
  buildTimeline(
    title: string,
    sections: Array<{ period: string; events: string[] }>,
    _options?: DiagramOptions
  ): string {
    const lines: string[] = ['timeline'];
    lines.push(`  title ${title}`);

    for (const section of sections) {
      lines.push(`  section ${section.period}`);
      for (const event of section.events) {
        lines.push(`    ${event}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Gitグラフを生成
   */
  buildGitGraph(
    commits: Array<{
      id?: string;
      type: 'commit' | 'branch' | 'checkout' | 'merge';
      message?: string;
      tag?: string;
      branch?: string;
    }>,
    _options?: DiagramOptions
  ): string {
    const lines: string[] = ['gitGraph'];

    for (const commit of commits) {
      switch (commit.type) {
        case 'commit':
          let line = '  commit';
          if (commit.id) {
            line += ` id: "${commit.id}"`;
          }
          if (commit.message) {
            line += ` msg: "${commit.message}"`;
          }
          if (commit.tag) {
            line += ` tag: "${commit.tag}"`;
          }
          lines.push(line);
          break;
        case 'branch':
          lines.push(`  branch ${commit.branch}`);
          break;
        case 'checkout':
          lines.push(`  checkout ${commit.branch}`);
          break;
        case 'merge':
          lines.push(`  merge ${commit.branch}`);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Mermaidコードをパース
   */
  parseDiagramType(definition: string): DiagramType {
    const firstLine = definition.trim().split('\n')[0]?.toLowerCase() ?? '';

    if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
      return 'flowchart';
    }
    if (firstLine.startsWith('sequencediagram')) {
      return 'sequence';
    }
    if (firstLine.startsWith('classdiagram')) {
      return 'class';
    }
    if (firstLine.startsWith('statediagram')) {
      return 'state';
    }
    if (firstLine.startsWith('erdiagram')) {
      return 'er';
    }
    if (firstLine.startsWith('gantt')) {
      return 'gantt';
    }
    if (firstLine.startsWith('pie')) {
      return 'pie';
    }
    if (firstLine.startsWith('mindmap')) {
      return 'mindmap';
    }
    if (firstLine.startsWith('timeline')) {
      return 'timeline';
    }
    if (firstLine.startsWith('gitgraph')) {
      return 'gitgraph';
    }

    return 'custom';
  }

  /**
   * Mermaid定義にテーマ設定を追加
   */
  wrapWithTheme(definition: string, theme: string): string {
    const directive = `%%{init: {'theme': '${theme}'}}%%`;
    return `${directive}\n${definition}`;
  }

  /**
   * プロセス定義からフローチャートを生成（REQ-EXT-VIS-002）
   * @param process プロセス定義
   * @returns フローチャート生成結果
   */
  generateProcessFlowchart(process: ProcessDefinition): ProcessFlowchartResult {
    const warnings: string[] = [];
    const direction = process.direction ?? 'TB';
    
    // ステップにIDを割り当て
    const stepsWithIds = process.steps.map((step, index) => ({
      ...step,
      id: step.id ?? `step${index + 1}`,
    }));
    
    // ノードとエッジを構築
    const nodes: FlowchartNode[] = [];
    const edges: FlowchartEdge[] = [];
    
    for (let i = 0; i < stepsWithIds.length; i++) {
      const step = stepsWithIds[i];
      if (!step) continue;
      
      // ノード形状を決定
      let shape: FlowchartNode['shape'] = 'rectangle';
      switch (step.type) {
        case 'start':
          shape = 'rounded';
          break;
        case 'end':
          shape = 'rounded';
          break;
        case 'decision':
          shape = 'diamond';
          break;
        case 'input':
        case 'output':
          shape = 'parallelogram';
          break;
        case 'subprocess':
          shape = 'rounded';
          break;
        case 'process':
        default:
          shape = 'rectangle';
      }
      
      nodes.push({
        id: step.id,
        label: step.label,
        shape,
      });
      
      // エッジを構築
      if (step.next) {
        if (typeof step.next === 'string') {
          // 単一の次ステップ
          edges.push({
            from: step.id,
            to: step.next,
          });
        } else if (Array.isArray(step.next)) {
          // 条件付き分岐
          for (const branch of step.next) {
            edges.push({
              from: step.id,
              to: branch.stepId,
              label: branch.condition,
            });
          }
        }
      } else if (i < stepsWithIds.length - 1 && step.type !== 'end') {
        // 次のステップが指定されていない場合、順番に接続
        const nextStep = stepsWithIds[i + 1];
        if (nextStep) {
          edges.push({
            from: step.id,
            to: nextStep.id,
          });
        }
      }
    }
    
    // 孤立ノードの警告
    const connectedNodes = new Set<string>();
    for (const edge of edges) {
      connectedNodes.add(edge.from);
      connectedNodes.add(edge.to);
    }
    for (const node of nodes) {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        warnings.push(`ノード "${node.id}" は他のノードと接続されていません`);
      }
    }
    
    // 存在しないノードへの参照をチェック
    const nodeIds = new Set(nodes.map(n => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.to)) {
        warnings.push(`エッジが存在しないノード "${edge.to}" を参照しています`);
      }
    }
    
    // Mermaid構文を生成
    const flowchartData: FlowchartData = { nodes, edges };
    const mermaid = this.buildFlowchart(flowchartData, { type: 'flowchart', direction });
    
    return {
      mermaid,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      warnings,
    };
  }

  /**
   * テキスト記述からフローチャートを生成（REQ-EXT-VIS-002）
   * 番号付きリストや箇条書きをパースしてフローチャートに変換
   * @param text プロセス記述テキスト
   * @param options オプション
   * @returns フローチャート生成結果
   */
  generateFlowchartFromText(
    text: string,
    options?: {
      direction?: 'TB' | 'BT' | 'LR' | 'RL';
      detectDecisions?: boolean;
    }
  ): ProcessFlowchartResult {
    const warnings: string[] = [];
    const direction = options?.direction ?? 'TB';
    const detectDecisions = options?.detectDecisions ?? true;
    
    // テキストをパース
    const lines = text.split('\n').filter(line => line.trim());
    const steps: ProcessStep[] = [];
    
    // 開始/終了キーワード
    const startKeywords = ['開始', '始め', 'start', 'begin', '最初'];
    const endKeywords = ['終了', '終わり', 'end', 'finish', '完了'];
    const decisionKeywords = ['判断', '確認', 'if', '条件', '分岐', '?', '？', 'check', 'decide'];
    const inputKeywords = ['入力', 'input', '取得', '受け取'];
    const outputKeywords = ['出力', 'output', '表示', '送信', '返す'];
    
    for (const line of lines) {
      // 番号付きリストまたは箇条書きをパース
      const match = line.match(/^[\s]*(?:(\d+)[.）)]\s*|[-*•]\s*|>\s*)?(.+)/);
      if (!match) continue;
      
      const label = match[2]?.trim();
      if (!label) continue;
      
      const lowerLabel = label.toLowerCase();
      
      // ステップタイプを推定
      let type: ProcessStep['type'] = 'process';
      
      if (startKeywords.some(k => lowerLabel.includes(k.toLowerCase()))) {
        type = 'start';
      } else if (endKeywords.some(k => lowerLabel.includes(k.toLowerCase()))) {
        type = 'end';
      } else if (detectDecisions && decisionKeywords.some(k => lowerLabel.includes(k.toLowerCase()))) {
        type = 'decision';
      } else if (inputKeywords.some(k => lowerLabel.includes(k.toLowerCase()))) {
        type = 'input';
      } else if (outputKeywords.some(k => lowerLabel.includes(k.toLowerCase()))) {
        type = 'output';
      }
      
      steps.push({
        label,
        type,
      });
    }
    
    if (steps.length === 0) {
      warnings.push('テキストからステップを検出できませんでした');
      return {
        mermaid: `flowchart ${direction}\n  empty["ステップなし"]`,
        nodeCount: 0,
        edgeCount: 0,
        warnings,
      };
    }
    
    // ProcessDefinitionとして生成
    return this.generateProcessFlowchart({
      steps,
      direction,
    });
  }

  /**
   * ノードをフォーマット
   */
  private formatNode(node: FlowchartNode): string {
    const shape = node.shape ?? 'rectangle';
    const label = node.label;

    switch (shape) {
      case 'rounded':
        return `${node.id}("${label}")`;
      case 'circle':
        return `${node.id}(("${label}"))`;
      case 'diamond':
        return `${node.id}{"${label}"}`;
      case 'hexagon':
        return `${node.id}{{{"${label}"}}}`;
      case 'parallelogram':
        return `${node.id}[/"${label}"/]`;
      default:
        return `${node.id}["${label}"]`;
    }
  }

  /**
   * エッジをフォーマット
   */
  private formatEdge(edge: FlowchartEdge): string {
    const style = edge.style ?? 'solid';
    const arrow = edge.arrow ?? 'arrow';
    const label = edge.label ? `|${edge.label}|` : '';

    let connector: string;
    switch (style) {
      case 'dashed':
        connector = arrow === 'arrow' ? '-.->' : '-..-';
        break;
      case 'dotted':
        connector = arrow === 'arrow' ? '..>' : '...';
        break;
      case 'thick':
        connector = arrow === 'arrow' ? '==>' : '===';
        break;
      default:
        connector = arrow === 'arrow' ? '-->' : '---';
    }

    return `${edge.from} ${connector}${label} ${edge.to}`;
  }

  /**
   * シーケンス図の矢印を取得
   */
  private getSequenceArrow(type?: string): string {
    switch (type) {
      case 'dotted':
        return '-->>';
      case 'async':
        return '--)';
      case 'reply':
        return '-->';
      default:
        return '->>';
    }
  }

  /**
   * クラス関係の矢印を取得
   */
  private getClassRelationArrow(type: ClassRelation['type']): string {
    switch (type) {
      case 'inheritance':
        return '<|--';
      case 'composition':
        return '*--';
      case 'aggregation':
        return 'o--';
      case 'association':
        return '-->';
      case 'dependency':
        return '..>';
      case 'realization':
        return '..|>';
    }
  }
}
