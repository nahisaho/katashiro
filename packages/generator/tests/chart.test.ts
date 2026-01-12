/**
 * Chart/Diagram Module Tests
 * REQ-MEDIA-002: 図表生成
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { isOk, isErr } from '@nahisaho/katashiro-core';
import {
  ChartGenerator,
  DiagramGenerator,
  SvgBuilder,
  MermaidBuilder,
  DEFAULT_CHART_CONFIG,
  CHART_ERROR_CODES,
  ChartGeneratorError,
  THEME_PALETTES,
  type ChartData,
  type ChartOptions,
  type FlowchartData,
  type SequenceData,
  type ClassDiagramData,
  type GanttData,
} from '../src/chart/index';

describe('ChartGenerator', () => {
  let generator: ChartGenerator;

  beforeEach(() => {
    generator = new ChartGenerator();
  });

  describe('constructor', () => {
    it('should use default config when no options provided', () => {
      const gen = new ChartGenerator();
      expect(gen).toBeInstanceOf(ChartGenerator);
    });

    it('should allow custom config', () => {
      const gen = new ChartGenerator({
        defaultWidth: 1200,
        defaultHeight: 800,
      });
      expect(gen).toBeInstanceOf(ChartGenerator);
    });
  });

  describe('generate (IChartGenerator interface)', () => {
    it('should generate bar chart via interface', async () => {
      const data = {
        labels: ['A', 'B', 'C'],
        series: [{ name: 'Series1', data: [10, 20, 30] }],
      };

      const result = await generator.generate(data, {
        type: 'bar',
        title: 'Test Chart',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('<svg');
        expect(result.value).toContain('Test Chart');
      }
    });

    it('should generate line chart via interface', async () => {
      const data = {
        labels: ['Jan', 'Feb', 'Mar'],
        series: [{ name: 'Sales', data: [100, 150, 200] }],
      };

      const result = await generator.generate(data, { type: 'line' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('<svg');
      }
    });

    it('should generate pie chart via interface', async () => {
      const data = {
        labels: ['Red', 'Blue', 'Green'],
        series: [{ name: 'Colors', data: [30, 40, 30] }],
      };

      const result = await generator.generate(data, { type: 'pie' });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('<svg');
      }
    });

    it('should generate scatter chart via interface', async () => {
      const data = {
        labels: ['1', '2', '3'],
        series: [{ name: 'Points', data: [10, 20, 15] }],
      };

      const result = await generator.generate(data, { type: 'scatter' });

      expect(isOk(result)).toBe(true);
    });

    it('should return error for invalid data', async () => {
      const result = await generator.generate(null, { type: 'bar' });

      expect(isErr(result)).toBe(true);
    });

    it('should return error for missing series', async () => {
      const result = await generator.generate({}, { type: 'bar' });

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateChart', () => {
    it('should generate bar chart with full options', async () => {
      const data: ChartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        series: [
          { name: 'Revenue', data: [100, 150, 200, 250], color: '#2563eb' },
          { name: 'Profit', data: [20, 35, 45, 60], color: '#16a34a' },
        ],
      };

      const options: ChartOptions = {
        type: 'bar',
        title: 'Quarterly Report',
        subtitle: 'FY2024',
        width: 800,
        height: 600,
        xAxis: { title: 'Quarter' },
        yAxis: { title: 'Amount ($)', showGrid: true },
        legend: { show: true, position: 'bottom', orientation: 'horizontal' },
        showValues: true,
      };

      const output = await generator.generateChart(data, options);

      expect(output.format).toBe('svg');
      expect(output.width).toBe(800);
      expect(output.height).toBe(600);
      expect(output.metadata.type).toBe('bar');
      expect(output.content).toContain('<svg');
      expect(output.content).toContain('Quarterly Report');
    });

    it('should generate line chart with multiple series', async () => {
      const data: ChartData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        series: [
          { name: 'Website', data: [100, 120, 115, 140, 160], style: 'solid' },
          { name: 'Mobile', data: [80, 90, 100, 110, 130], style: 'dashed' },
        ],
      };

      const output = await generator.generateChart(data, {
        type: 'line',
        title: 'Traffic Analysis',
      });

      expect(output.metadata.type).toBe('line');
      expect(output.content).toContain('<polyline');
    });

    it('should generate doughnut chart', async () => {
      const data: ChartData = {
        labels: ['Desktop', 'Mobile', 'Tablet'],
        series: [{ name: 'Devices', data: [45, 40, 15] }],
      };

      const output = await generator.generateChart(data, {
        type: 'doughnut',
        title: 'Device Distribution',
      });

      expect(output.metadata.type).toBe('doughnut');
    });

    it('should generate area chart', async () => {
      const data: ChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        series: [{ name: 'Users', data: [100, 150, 180, 220] }],
      };

      const output = await generator.generateChart(data, { type: 'area' });

      expect(output.metadata.type).toBe('area');
      expect(output.content).toContain('<path');
    });

    it('should generate radar chart', async () => {
      const data: ChartData = {
        labels: ['Speed', 'Power', 'Control', 'Spin', 'Durability'],
        series: [
          { name: 'Product A', data: [80, 70, 90, 60, 85] },
          { name: 'Product B', data: [70, 85, 75, 90, 70] },
        ],
      };

      const output = await generator.generateChart(data, {
        type: 'radar',
        title: 'Product Comparison',
      });

      expect(output.metadata.type).toBe('radar');
      expect(output.content).toContain('<polygon');
    });

    it('should apply theme colors', async () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C'],
        series: [{ name: 'Data', data: [10, 20, 30] }],
      };

      const output = await generator.generateChart(data, {
        type: 'bar',
        theme: 'dark',
      });

      expect(output.content).toContain(THEME_PALETTES.dark[0]);
    });

    it('should throw error for invalid chart type', async () => {
      const data: ChartData = {
        labels: ['A'],
        series: [{ name: 'Data', data: [10] }],
      };

      await expect(
        generator.generateChart(data, { type: 'invalid' as any })
      ).rejects.toThrow(ChartGeneratorError);
    });

    it('should throw error for empty series', async () => {
      const data: ChartData = {
        labels: ['A', 'B'],
        series: [],
      };

      await expect(
        generator.generateChart(data, { type: 'bar' })
      ).rejects.toThrow(ChartGeneratorError);
    });
  });

  describe('convenience methods', () => {
    it('should generate bar chart via convenience method', async () => {
      const output = await generator.generateBarChart(
        ['Jan', 'Feb', 'Mar'],
        [{ name: 'Sales', data: [100, 150, 200] }],
        { title: 'Monthly Sales' }
      );

      expect(output.metadata.type).toBe('bar');
    });

    it('should generate line chart via convenience method', async () => {
      const output = await generator.generateLineChart(
        ['Mon', 'Tue', 'Wed'],
        [{ name: 'Traffic', data: [100, 120, 110], style: 'dashed' }]
      );

      expect(output.metadata.type).toBe('line');
    });

    it('should generate pie chart via convenience method', async () => {
      const output = await generator.generatePieChart([
        { label: 'A', value: 30 },
        { label: 'B', value: 40 },
        { label: 'C', value: 30 },
      ]);

      expect(output.metadata.type).toBe('pie');
    });

    it('should generate doughnut chart via convenience method', async () => {
      const output = await generator.generatePieChart(
        [
          { label: 'X', value: 50 },
          { label: 'Y', value: 50 },
        ],
        { isDoughnut: true }
      );

      expect(output.metadata.type).toBe('doughnut');
    });

    it('should generate scatter chart via convenience method', async () => {
      const output = await generator.generateScatterChart([
        {
          name: 'Points',
          data: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 3 },
          ],
        },
      ]);

      expect(output.metadata.type).toBe('scatter');
    });

    it('should generate area chart via convenience method', async () => {
      const output = await generator.generateAreaChart(
        ['Q1', 'Q2', 'Q3', 'Q4'],
        [{ name: 'Revenue', data: [100, 150, 180, 200] }]
      );

      expect(output.metadata.type).toBe('area');
    });

    it('should generate radar chart via convenience method', async () => {
      const output = await generator.generateRadarChart(
        ['A', 'B', 'C', 'D', 'E'],
        [{ name: 'Score', data: [80, 70, 90, 60, 85] }]
      );

      expect(output.metadata.type).toBe('radar');
    });
  });
});

describe('DiagramGenerator', () => {
  let generator: DiagramGenerator;

  beforeEach(() => {
    generator = new DiagramGenerator();
  });

  describe('generate', () => {
    it('should generate diagram from Mermaid definition', async () => {
      const definition = `flowchart TD
        A[Start] --> B[Process]
        B --> C[End]`;

      const result = await generator.generate(definition);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.format).toBe('svg');
        expect(result.value.metadata.type).toBe('flowchart');
      }
    });

    it('should apply theme', async () => {
      const definition = `flowchart LR
        A --> B`;

      const result = await generator.generate(definition, { theme: 'dark' });

      expect(isOk(result)).toBe(true);
    });

    it('should return error for empty definition', async () => {
      const result = await generator.generate('');

      expect(isErr(result)).toBe(true);
    });

    it('should return error for invalid definition', async () => {
      const result = await generator.generate(null as any);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateFlowchart', () => {
    it('should generate flowchart from data', async () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'Start', shape: 'rounded' },
          { id: 'B', label: 'Process', shape: 'rectangle' },
          { id: 'C', label: 'Decision', shape: 'diamond' },
          { id: 'D', label: 'End', shape: 'rounded' },
        ],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
          { from: 'C', to: 'D', label: 'Yes' },
        ],
      };

      const result = await generator.generateFlowchart(data);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.metadata.type).toBe('flowchart');
      }
    });

    it('should support subgraphs', async () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'A' },
          { id: 'B', label: 'B' },
          { id: 'C', label: 'C' },
        ],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ],
        subgraphs: [{ id: 'sub1', label: 'Subprocess', nodes: ['B', 'C'] }],
      };

      const result = await generator.generateFlowchart(data, {
        direction: 'LR',
      });

      expect(isOk(result)).toBe(true);
    });

    it('should return error for empty nodes', async () => {
      const data: FlowchartData = {
        nodes: [],
        edges: [],
      };

      const result = await generator.generateFlowchart(data);

      expect(isErr(result)).toBe(true);
    });

    it('should return error for invalid edge reference', async () => {
      const data: FlowchartData = {
        nodes: [{ id: 'A', label: 'A' }],
        edges: [{ from: 'A', to: 'B' }], // B does not exist
      };

      const result = await generator.generateFlowchart(data);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateSequenceDiagram', () => {
    it('should generate sequence diagram from data', async () => {
      const data: SequenceData = {
        participants: [
          { id: 'client', name: 'Client' },
          { id: 'server', name: 'Server' },
          { id: 'db', name: 'Database', type: 'participant' },
        ],
        messages: [
          { from: 'client', to: 'server', message: 'Request' },
          { from: 'server', to: 'db', message: 'Query' },
          { from: 'db', to: 'server', message: 'Result', type: 'reply' },
          { from: 'server', to: 'client', message: 'Response', type: 'reply' },
        ],
      };

      const result = await generator.generateSequenceDiagram(data);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.metadata.type).toBe('sequence');
      }
    });

    it('should return error for empty participants', async () => {
      const data: SequenceData = {
        participants: [],
        messages: [],
      };

      const result = await generator.generateSequenceDiagram(data);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateClassDiagram', () => {
    it('should generate class diagram from data', async () => {
      const data: ClassDiagramData = {
        classes: [
          {
            name: 'Animal',
            annotation: 'abstract',
            attributes: [{ name: 'name', type: 'string', visibility: '-' }],
            methods: [
              { name: 'speak', returnType: 'void', visibility: '+' },
            ],
          },
          {
            name: 'Dog',
            methods: [
              { name: 'speak', returnType: 'void', visibility: '+' },
              { name: 'bark', returnType: 'void', visibility: '+' },
            ],
          },
        ],
        relations: [{ from: 'Dog', to: 'Animal', type: 'inheritance' }],
      };

      const result = await generator.generateClassDiagram(data);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.metadata.type).toBe('class');
      }
    });

    it('should return error for empty classes', async () => {
      const data: ClassDiagramData = {
        classes: [],
        relations: [],
      };

      const result = await generator.generateClassDiagram(data);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateStateDiagram', () => {
    it('should generate state diagram', async () => {
      const states = [
        { id: 'Idle', type: 'start' as const },
        { id: 'Running', label: 'Running' },
        { id: 'Paused', label: 'Paused' },
        { id: 'Done', type: 'end' as const },
      ];

      const transitions = [
        { from: 'Idle', to: 'Running', label: 'start' },
        { from: 'Running', to: 'Paused', label: 'pause' },
        { from: 'Paused', to: 'Running', label: 'resume' },
        { from: 'Running', to: 'Done', label: 'complete' },
      ];

      const result = await generator.generateStateDiagram(states, transitions);

      expect(isOk(result)).toBe(true);
    });

    it('should return error for empty states', async () => {
      const result = await generator.generateStateDiagram([], []);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateErDiagram', () => {
    it('should generate ER diagram', async () => {
      const entities = [
        {
          name: 'User',
          attributes: [
            { name: 'id', type: 'int', key: 'PK' as const },
            { name: 'name', type: 'string' },
          ],
        },
        {
          name: 'Order',
          attributes: [
            { name: 'id', type: 'int', key: 'PK' as const },
            { name: 'user_id', type: 'int', key: 'FK' as const },
          ],
        },
      ];

      const relationships = [
        {
          from: 'User',
          to: 'Order',
          relation: 'places',
          fromCardinality: '||' as const,
          toCardinality: 'o{' as const,
        },
      ];

      const result = await generator.generateErDiagram(entities, relationships);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('generateGanttChart', () => {
    it('should generate Gantt chart', async () => {
      const data: GanttData = {
        title: 'Project Timeline',
        dateFormat: 'YYYY-MM-DD',
        tasks: [
          {
            id: 'task1',
            name: 'Design',
            section: 'Phase 1',
            start: '2024-01-01',
            end: '2024-01-15',
          },
          {
            id: 'task2',
            name: 'Development',
            section: 'Phase 1',
            start: '2024-01-10',
            end: '2024-02-01',
          },
          {
            id: 'task3',
            name: 'Testing',
            section: 'Phase 2',
            after: 'task2',
            end: '10d',
            status: 'crit',
          },
        ],
      };

      const result = await generator.generateGanttChart(data);

      expect(isOk(result)).toBe(true);
    });

    it('should return error for empty tasks', async () => {
      const data: GanttData = {
        tasks: [],
      };

      const result = await generator.generateGanttChart(data);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generatePieChart (Mermaid)', () => {
    it('should generate pie chart via Mermaid', async () => {
      const data = [
        { label: 'Chrome', value: 60 },
        { label: 'Firefox', value: 20 },
        { label: 'Safari', value: 15 },
        { label: 'Other', value: 5 },
      ];

      const result = await generator.generatePieChart(data, {
        title: 'Browser Share',
      });

      expect(isOk(result)).toBe(true);
    });
  });

  describe('generateMindmap', () => {
    it('should generate mindmap', async () => {
      const result = await generator.generateMindmap('Project', [
        {
          text: 'Frontend',
          children: [{ text: 'React' }, { text: 'Vue' }],
        },
        {
          text: 'Backend',
          children: [{ text: 'Node.js' }, { text: 'Python' }],
        },
      ]);

      expect(isOk(result)).toBe(true);
    });

    it('should return error for empty root', async () => {
      const result = await generator.generateMindmap('', []);

      expect(isErr(result)).toBe(true);
    });
  });

  describe('generateTimeline', () => {
    it('should generate timeline', async () => {
      const result = await generator.generateTimeline('Company History', [
        { period: '2020', events: ['Founded', 'First product'] },
        { period: '2021', events: ['Series A', 'Team expansion'] },
        { period: '2022', events: ['Series B', 'Global launch'] },
      ]);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('generateGitGraph', () => {
    it('should generate git graph', async () => {
      const result = await generator.generateGitGraph([
        { type: 'commit', message: 'Initial commit' },
        { type: 'branch', branch: 'feature' },
        { type: 'checkout', branch: 'feature' },
        { type: 'commit', message: 'Add feature' },
        { type: 'checkout', branch: 'main' },
        { type: 'merge', branch: 'feature' },
        { type: 'commit', message: 'Release', tag: 'v1.0' },
      ]);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('detectDiagramType', () => {
    it('should detect flowchart', () => {
      expect(generator.detectDiagramType('flowchart TD')).toBe('flowchart');
      expect(generator.detectDiagramType('graph LR')).toBe('flowchart');
    });

    it('should detect sequence diagram', () => {
      expect(generator.detectDiagramType('sequenceDiagram')).toBe('sequence');
    });

    it('should detect class diagram', () => {
      expect(generator.detectDiagramType('classDiagram')).toBe('class');
    });

    it('should detect state diagram', () => {
      expect(generator.detectDiagramType('stateDiagram-v2')).toBe('state');
    });

    it('should detect gantt', () => {
      expect(generator.detectDiagramType('gantt')).toBe('gantt');
    });

    it('should return custom for unknown types', () => {
      expect(generator.detectDiagramType('unknown')).toBe('custom');
    });
  });

  describe('validateDefinition', () => {
    it('should validate correct definition', () => {
      const result = generator.validateDefinition('flowchart TD\n  A --> B');
      expect(result.valid).toBe(true);
    });

    it('should reject empty definition', () => {
      const result = generator.validateDefinition('');
      expect(result.valid).toBe(false);
    });

    it('should reject unknown diagram type', () => {
      const result = generator.validateDefinition('unknown diagram type');
      expect(result.valid).toBe(false);
    });
  });
});

describe('SvgBuilder', () => {
  it('should create SVG with correct dimensions', () => {
    const builder = new SvgBuilder({ type: 'bar', width: 600, height: 400 });
    builder.addHeader();
    const svg = builder.build();

    expect(svg).toContain('width="600"');
    expect(svg).toContain('height="400"');
  });

  it('should add title and subtitle', () => {
    const builder = new SvgBuilder({
      type: 'bar',
      title: 'Main Title',
      subtitle: 'Sub Title',
    });
    builder.addHeader();
    builder.addTitle();
    const svg = builder.build();

    expect(svg).toContain('Main Title');
    expect(svg).toContain('Sub Title');
  });

  it('should use custom colors', () => {
    const builder = new SvgBuilder({
      type: 'bar',
      colors: ['#ff0000', '#00ff00'],
    });

    const colors = builder.getColors();
    expect(colors).toContain('#ff0000');
    expect(colors).toContain('#00ff00');
  });

  it('should use theme colors when no custom colors', () => {
    const builder = new SvgBuilder({
      type: 'bar',
      theme: 'pastel',
    });

    const colors = builder.getColors();
    expect(colors).toEqual(THEME_PALETTES.pastel);
  });
});

describe('MermaidBuilder', () => {
  let builder: MermaidBuilder;

  beforeEach(() => {
    builder = new MermaidBuilder();
  });

  describe('buildFlowchart', () => {
    it('should build simple flowchart', () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'Start' },
          { id: 'B', label: 'End' },
        ],
        edges: [{ from: 'A', to: 'B' }],
      };

      const result = builder.buildFlowchart(data);

      expect(result).toContain('flowchart TB');
      expect(result).toContain('A["Start"]');
      expect(result).toContain('B["End"]');
      expect(result).toContain('A --> B');
    });

    it('should support different node shapes', () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'Rounded', shape: 'rounded' },
          { id: 'B', label: 'Circle', shape: 'circle' },
          { id: 'C', label: 'Diamond', shape: 'diamond' },
        ],
        edges: [],
      };

      const result = builder.buildFlowchart(data);

      expect(result).toContain('A("Rounded")');
      expect(result).toContain('B(("Circle"))');
      expect(result).toContain('C{"Diamond"}');
    });

    it('should support edge styles', () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'A' },
          { id: 'B', label: 'B' },
          { id: 'C', label: 'C' },
        ],
        edges: [
          { from: 'A', to: 'B', style: 'dashed' },
          { from: 'B', to: 'C', style: 'dotted' },
        ],
      };

      const result = builder.buildFlowchart(data);

      expect(result).toContain('-.->' );
      expect(result).toContain('..>');
    });
  });

  describe('buildSequenceDiagram', () => {
    it('should build sequence diagram', () => {
      const data: SequenceData = {
        participants: [
          { id: 'A', name: 'Alice' },
          { id: 'B', name: 'Bob' },
        ],
        messages: [{ from: 'A', to: 'B', message: 'Hello' }],
      };

      const result = builder.buildSequenceDiagram(data);

      expect(result).toContain('sequenceDiagram');
      expect(result).toContain('participant A as Alice');
      expect(result).toContain('A->>B: Hello');
    });
  });

  describe('buildClassDiagram', () => {
    it('should build class diagram', () => {
      const data: ClassDiagramData = {
        classes: [
          {
            name: 'Animal',
            attributes: [{ name: 'name', type: 'string', visibility: '+' }],
            methods: [
              { name: 'speak', returnType: 'void', visibility: '+' },
            ],
          },
        ],
        relations: [],
      };

      const result = builder.buildClassDiagram(data);

      expect(result).toContain('classDiagram');
      expect(result).toContain('class Animal');
      expect(result).toContain('+string name');
      expect(result).toContain('+speak() void');
    });
  });

  describe('buildGanttChart', () => {
    it('should build gantt chart', () => {
      const data: GanttData = {
        title: 'Project',
        tasks: [
          {
            id: 'task1',
            name: 'Task 1',
            start: '2024-01-01',
            end: '2024-01-15',
          },
        ],
      };

      const result = builder.buildGanttChart(data);

      expect(result).toContain('gantt');
      expect(result).toContain('title Project');
      expect(result).toContain('Task 1');
    });
  });

  describe('buildPieChart', () => {
    it('should build pie chart', () => {
      const data = [
        { label: 'A', value: 30 },
        { label: 'B', value: 70 },
      ];

      const result = builder.buildPieChart(data, { title: 'Distribution' });

      expect(result).toContain('pie');
      expect(result).toContain('title Distribution');
      expect(result).toContain('"A" : 30');
      expect(result).toContain('"B" : 70');
    });
  });

  describe('parseDiagramType', () => {
    it('should parse various diagram types', () => {
      expect(builder.parseDiagramType('flowchart TD')).toBe('flowchart');
      expect(builder.parseDiagramType('sequenceDiagram')).toBe('sequence');
      expect(builder.parseDiagramType('classDiagram')).toBe('class');
      expect(builder.parseDiagramType('erDiagram')).toBe('er');
      expect(builder.parseDiagramType('pie')).toBe('pie');
      expect(builder.parseDiagramType('mindmap')).toBe('mindmap');
      expect(builder.parseDiagramType('timeline')).toBe('timeline');
      expect(builder.parseDiagramType('gitGraph')).toBe('gitgraph');
    });
  });

  describe('wrapWithTheme', () => {
    it('should wrap definition with theme directive', () => {
      const result = builder.wrapWithTheme('flowchart TD\n  A --> B', 'dark');

      expect(result).toContain("%%{init: {'theme': 'dark'}}%%");
      expect(result).toContain('flowchart TD');
    });
  });
});

describe('Constants and Types', () => {
  it('should have correct default config', () => {
    expect(DEFAULT_CHART_CONFIG.defaultWidth).toBe(800);
    expect(DEFAULT_CHART_CONFIG.defaultHeight).toBe(600);
    expect(DEFAULT_CHART_CONFIG.defaultTheme).toBe('default');
    expect(DEFAULT_CHART_CONFIG.defaultFormat).toBe('svg');
    expect(DEFAULT_CHART_CONFIG.defaultColors.length).toBeGreaterThan(0);
  });

  it('should have all error codes', () => {
    expect(CHART_ERROR_CODES.INVALID_DATA).toBe('CHART_INVALID_DATA');
    expect(CHART_ERROR_CODES.INVALID_TYPE).toBe('CHART_INVALID_TYPE');
    expect(CHART_ERROR_CODES.RENDER_FAILED).toBe('CHART_RENDER_FAILED');
    expect(CHART_ERROR_CODES.INVALID_DIAGRAM).toBe('CHART_INVALID_DIAGRAM');
    expect(CHART_ERROR_CODES.EXPORT_FAILED).toBe('CHART_EXPORT_FAILED');
    expect(CHART_ERROR_CODES.UNSUPPORTED_FORMAT).toBe('CHART_UNSUPPORTED_FORMAT');
  });

  it('should have all theme palettes', () => {
    expect(THEME_PALETTES.default).toBeDefined();
    expect(THEME_PALETTES.dark).toBeDefined();
    expect(THEME_PALETTES.pastel).toBeDefined();
    expect(THEME_PALETTES.vibrant).toBeDefined();
    expect(THEME_PALETTES.monochrome).toBeDefined();
    expect(THEME_PALETTES.custom).toBeDefined();
  });

  it('should create ChartGeneratorError correctly', () => {
    const error = new ChartGeneratorError('TEST_CODE', 'Test message');

    expect(error.name).toBe('ChartGeneratorError');
    expect(error.code).toBe('TEST_CODE');
    expect(error.message).toBe('Test message');
    expect(error instanceof Error).toBe(true);
  });
});
