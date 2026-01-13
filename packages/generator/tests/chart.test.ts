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

describe('REQ-EXT-VIS-001: Base64/Markdown出力', () => {
  let generator: ChartGenerator;

  beforeEach(() => {
    generator = new ChartGenerator();
  });

  const sampleData: ChartData = {
    labels: ['A', 'B', 'C'],
    series: [{ name: 'Series1', data: [10, 20, 30] }],
  };

  const sampleOptions: ChartOptions = {
    type: 'bar',
    title: 'Sample Chart',
  };

  describe('generateBase64', () => {
    it('should generate Base64 encoded SVG', async () => {
      const result = await generator.generateBase64(sampleData, sampleOptions);

      expect(result.format).toBe('svg');
      expect(typeof result.base64).toBe('string');
      expect(result.base64.length).toBeGreaterThan(0);
      expect(result.dataUri).toContain('data:image/svg+xml;base64,');
      expect(result.mimeType).toBe('image/svg+xml');
    });

    it('should produce valid Base64 string', async () => {
      const result = await generator.generateBase64(sampleData, sampleOptions);

      // Base64をデコードしてSVGが含まれることを確認
      const decoded = Buffer.from(result.base64, 'base64').toString('utf-8');
      expect(decoded).toContain('<svg');
    });

    it('should include metadata', async () => {
      const result = await generator.generateBase64(sampleData, sampleOptions);

      expect(result.metadata.type).toBe('bar');
      expect(result.metadata.library).toBe('katashiro-chart');
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
    });
  });

  describe('generateMarkdownEmbed', () => {
    it('should generate Markdown image syntax', async () => {
      const result = await generator.generateMarkdownEmbed(sampleData, sampleOptions);

      expect(result.markdown).toMatch(/^!\[.*\]\(data:image\/svg\+xml;base64,.*\)$/);
      expect(result.altText).toBe('Sample Chart');
    });

    it('should generate HTML img tag', async () => {
      const result = await generator.generateMarkdownEmbed(sampleData, sampleOptions);

      expect(result.html).toContain('<img src="data:image/svg+xml;base64,');
      expect(result.html).toContain('alt="Sample Chart"');
      expect(result.html).toContain('/>');
    });

    it('should use custom altText', async () => {
      const result = await generator.generateMarkdownEmbed(sampleData, {
        ...sampleOptions,
        altText: 'Custom Alt Text',
      });

      expect(result.altText).toBe('Custom Alt Text');
      expect(result.markdown).toContain('![Custom Alt Text]');
    });

    it('should escape HTML special characters in altText', async () => {
      const result = await generator.generateMarkdownEmbed(sampleData, {
        ...sampleOptions,
        altText: '<script>alert("XSS")</script>',
      });

      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });
  });

  describe('generateBarChartBase64', () => {
    it('should generate bar chart in Base64 format', async () => {
      const result = await generator.generateBarChartBase64(
        ['Jan', 'Feb', 'Mar'],
        [{ name: 'Sales', data: [100, 150, 200] }]
      );

      expect(result.base64.length).toBeGreaterThan(0);
      expect(result.metadata.type).toBe('bar');
    });
  });

  describe('generateLineChartBase64', () => {
    it('should generate line chart in Base64 format', async () => {
      const result = await generator.generateLineChartBase64(
        ['Q1', 'Q2', 'Q3', 'Q4'],
        [{ name: 'Revenue', data: [100, 120, 140, 180] }]
      );

      expect(result.base64.length).toBeGreaterThan(0);
      expect(result.metadata.type).toBe('line');
    });
  });

  describe('generatePieChartBase64', () => {
    it('should generate pie chart in Base64 format', async () => {
      const result = await generator.generatePieChartBase64([
        { label: 'A', value: 30 },
        { label: 'B', value: 50 },
        { label: 'C', value: 20 },
      ]);

      expect(result.base64.length).toBeGreaterThan(0);
      expect(result.metadata.type).toBe('pie');
    });
  });

  describe('generateMarkdownReport', () => {
    it('should generate multiple charts in Markdown report', async () => {
      const report = await generator.generateMarkdownReport([
        {
          data: sampleData,
          options: { type: 'bar' },
          title: 'Bar Chart',
          description: 'This is a bar chart.',
        },
        {
          data: sampleData,
          options: { type: 'line' },
          title: 'Line Chart',
        },
      ]);

      expect(report).toContain('### Bar Chart');
      expect(report).toContain('This is a bar chart.');
      expect(report).toContain('### Line Chart');
      expect(report).toContain('![Bar Chart]');
      expect(report).toContain('![Line Chart]');
      expect(report).toContain('---');
    });

    it('should handle empty array', async () => {
      const report = await generator.generateMarkdownReport([]);

      expect(report).toBe('');
    });
  });
});

// REQ-EXT-VIS-002: フローチャート生成テスト
describe('MermaidBuilder - Process Flowchart (REQ-EXT-VIS-002)', () => {
  let builder: MermaidBuilder;

  beforeEach(() => {
    builder = new MermaidBuilder();
  });

  describe('generateProcessFlowchart', () => {
    it('should generate flowchart from simple process steps', () => {
      const result = builder.generateProcessFlowchart({
        steps: [
          { label: '開始', type: 'start' },
          { label: 'データ取得', type: 'process' },
          { label: '処理実行', type: 'process' },
          { label: '終了', type: 'end' },
        ],
      });

      expect(result.mermaid).toContain('flowchart TB');
      expect(result.nodeCount).toBe(4);
      expect(result.edgeCount).toBe(3);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle decision branches', () => {
      const result = builder.generateProcessFlowchart({
        steps: [
          { id: 'start', label: '開始', type: 'start' },
          { 
            id: 'check', 
            label: '条件確認', 
            type: 'decision',
            next: [
              { condition: 'Yes', stepId: 'process' },
              { condition: 'No', stepId: 'end' },
            ],
          },
          { id: 'process', label: '処理', type: 'process', next: 'end' },
          { id: 'end', label: '終了', type: 'end' },
        ],
      });

      expect(result.mermaid).toContain('flowchart TB');
      expect(result.mermaid).toContain('check{');  // diamond shape
      expect(result.mermaid).toContain('|Yes|');
      expect(result.mermaid).toContain('|No|');
      expect(result.nodeCount).toBe(4);
      expect(result.edgeCount).toBe(4);  // start->check, check->process, check->end, process->end
    });

    it('should support different directions', () => {
      const result = builder.generateProcessFlowchart({
        steps: [{ label: 'Step 1' }, { label: 'Step 2' }],
        direction: 'LR',
      });

      expect(result.mermaid).toContain('flowchart LR');
    });

    it('should handle input/output node types', () => {
      const result = builder.generateProcessFlowchart({
        steps: [
          { label: 'データ入力', type: 'input' },
          { label: '処理', type: 'process' },
          { label: '結果出力', type: 'output' },
        ],
      });

      expect(result.mermaid).toContain('[/"データ入力"/]');  // parallelogram
      expect(result.mermaid).toContain('[/"結果出力"/]');
      expect(result.nodeCount).toBe(3);
    });

    it('should warn about orphan nodes', () => {
      const result = builder.generateProcessFlowchart({
        steps: [
          { id: 'a', label: 'Step A', next: 'b' },
          { id: 'b', label: 'Step B', type: 'end' },
          { id: 'orphan', label: '孤立ノード', type: 'process' },  // 接続されていない
        ],
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('orphan');
    });

    it('should warn about invalid node references', () => {
      const result = builder.generateProcessFlowchart({
        steps: [
          { id: 'a', label: 'Step A', next: 'nonexistent' },
        ],
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('nonexistent');
    });

    it('should auto-generate IDs when not provided', () => {
      const result = builder.generateProcessFlowchart({
        steps: [
          { label: 'Step 1' },
          { label: 'Step 2' },
          { label: 'Step 3' },
        ],
      });

      expect(result.mermaid).toContain('step1');
      expect(result.mermaid).toContain('step2');
      expect(result.mermaid).toContain('step3');
    });
  });

  describe('generateFlowchartFromText', () => {
    it('should parse numbered list into flowchart', () => {
      const text = `
        1. 開始
        2. データを取得する
        3. データを処理する
        4. 終了
      `;

      const result = builder.generateFlowchartFromText(text);

      expect(result.nodeCount).toBe(4);
      expect(result.edgeCount).toBe(3);
      expect(result.mermaid).toContain('開始');
      expect(result.mermaid).toContain('データを取得する');
    });

    it('should parse bullet list into flowchart', () => {
      const text = `
        - Start the process
        - Validate input
        - Process data
        - Finish
      `;

      const result = builder.generateFlowchartFromText(text);

      expect(result.nodeCount).toBe(4);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect decision keywords', () => {
      const text = `
        1. 開始
        2. 条件を確認する
        3. 処理実行
        4. 終了
      `;

      const result = builder.generateFlowchartFromText(text, { detectDecisions: true });

      expect(result.mermaid).toContain('{');  // diamond shape for decision
    });

    it('should detect input/output keywords', () => {
      const text = `
        1. 開始
        2. ユーザーから入力を受け取る
        3. 結果を表示出力する
        4. 終了
      `;

      const result = builder.generateFlowchartFromText(text);

      // parallelogram shape for input/output
      expect(result.mermaid).toContain('[/');
    });

    it('should handle empty text gracefully', () => {
      const result = builder.generateFlowchartFromText('');

      expect(result.nodeCount).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should respect direction option', () => {
      const text = '1. A\n2. B\n3. C';

      const result = builder.generateFlowchartFromText(text, { direction: 'LR' });

      expect(result.mermaid).toContain('flowchart LR');
    });

    it('should handle Japanese process description', () => {
      const text = `
        1. 最初にデータを準備する
        2. データが正しいか確認する
        3. 分析処理を実行する
        4. 結果をファイルに出力する
        5. 処理完了
      `;

      const result = builder.generateFlowchartFromText(text);

      expect(result.nodeCount).toBe(5);
      expect(result.edgeCount).toBe(4);
      // 「確認」キーワードで判断ノードになる
      expect(result.mermaid).toContain('{');
      // 「出力」キーワードで出力ノードになる
      expect(result.mermaid).toContain('[/');
    });
  });
});

// ====================
// v1.0.1: Markdown/Mermaid表現テスト
// ====================

describe('DiagramGenerator - Markdown/Mermaid methods (v1.0.1)', () => {
  let generator: DiagramGenerator;

  beforeEach(() => {
    generator = new DiagramGenerator();
  });

  describe('generateMarkdownTable', () => {
    it('should generate a basic markdown table', () => {
      const headers = ['Name', 'Age', 'City'];
      const rows = [
        ['Alice', '30', 'Tokyo'],
        ['Bob', '25', 'Osaka'],
      ];

      const result = generator.generateMarkdownTable(headers, rows);

      expect(result).toContain('| Name | Age | City |');
      expect(result).toContain('| :--- | :--- | :--- |');
      expect(result).toContain('| Alice | 30 | Tokyo |');
      expect(result).toContain('| Bob | 25 | Osaka |');
    });

    it('should support alignment options', () => {
      const headers = ['Item', 'Price', 'Qty'];
      const rows = [['Apple', '100', '5']];

      const result = generator.generateMarkdownTable(headers, rows, {
        alignment: ['left', 'right', 'center'],
      });

      expect(result).toContain('| :--- | ---: | :---: |');
    });

    it('should handle empty rows gracefully', () => {
      const headers = ['A', 'B'];
      const rows: string[][] = [];

      const result = generator.generateMarkdownTable(headers, rows);

      expect(result).toContain('| A | B |');
      expect(result.split('\n').length).toBe(2); // header + alignment only
    });

    it('should handle missing cells in rows', () => {
      const headers = ['A', 'B', 'C'];
      const rows = [['1']]; // only one cell

      const result = generator.generateMarkdownTable(headers, rows);

      expect(result).toContain('| 1 |  |  |');
    });

    it('should return empty string for empty headers', () => {
      const result = generator.generateMarkdownTable([], []);
      expect(result).toBe('');
    });
  });

  describe('generateMermaidFlowchart', () => {
    it('should generate a mermaid flowchart definition', () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'Start' },
          { id: 'B', label: 'Process' },
          { id: 'C', label: 'End' },
        ],
        edges: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ],
      };

      const result = generator.generateMermaidFlowchart(data);

      expect(result).toContain('flowchart');
      expect(result).toContain('A[');
      expect(result).toContain('B[');
      expect(result).toContain('C[');
      expect(result).toContain('-->');
    });

    it('should support direction option', () => {
      const data: FlowchartData = {
        nodes: [{ id: 'A', label: 'Node' }],
        edges: [],
      };

      // TD is internally converted to TB (they are equivalent in Mermaid)
      const resultTD = generator.generateMermaidFlowchart(data, { direction: 'TD' });
      expect(resultTD).toContain('flowchart TB');

      const resultLR = generator.generateMermaidFlowchart(data, { direction: 'LR' });
      expect(resultLR).toContain('flowchart LR');
    });

    it('should handle edge labels', () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'Question' },
          { id: 'B', label: 'Yes' },
          { id: 'C', label: 'No' },
        ],
        edges: [
          { from: 'A', to: 'B', label: 'Yes' },
          { from: 'A', to: 'C', label: 'No' },
        ],
      };

      const result = generator.generateMermaidFlowchart(data);

      expect(result).toContain('|Yes|');
      expect(result).toContain('|No|');
    });
  });

  describe('generateMarkdownTree', () => {
    it('should generate a markdown tree with default marker', () => {
      const root = {
        label: 'Root',
        children: [
          { label: 'Child1' },
          { label: 'Child2', children: [{ label: 'Grandchild' }] },
        ],
      };

      const result = generator.generateMarkdownTree(root);

      expect(result).toContain('- Root');
      expect(result).toContain('  - Child1');
      expect(result).toContain('  - Child2');
      expect(result).toContain('    - Grandchild');
    });

    it('should support custom marker', () => {
      const root = {
        label: 'Root',
        children: [{ label: 'Child' }],
      };

      const result = generator.generateMarkdownTree(root, { marker: '*' });

      expect(result).toContain('* Root');
      expect(result).toContain('  * Child');
    });

    it('should handle deeply nested trees', () => {
      const root = {
        label: 'L1',
        children: [
          {
            label: 'L2',
            children: [
              {
                label: 'L3',
                children: [{ label: 'L4' }],
              },
            ],
          },
        ],
      };

      const result = generator.generateMarkdownTree(root);
      const lines = result.split('\n');

      expect(lines).toHaveLength(4);
      expect(lines[3]).toBe('      - L4'); // 6 spaces for depth 3
    });

    it('should handle root without children', () => {
      const root = { label: 'OnlyRoot' };

      const result = generator.generateMarkdownTree(root);

      expect(result).toBe('- OnlyRoot');
    });
  });

  describe('ASCII methods deprecation (v1.0.1)', () => {
    it('generateAsciiFlowchart should still work but is deprecated', () => {
      const data: FlowchartData = {
        nodes: [
          { id: 'A', label: 'Start' },
          { id: 'B', label: 'End' },
        ],
        edges: [{ from: 'A', to: 'B' }],
      };

      // Should still produce output (backward compatibility)
      const result = generator.generateAsciiFlowchart(data);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('generateAsciiTable should still work but is deprecated', () => {
      const headers = ['A', 'B'];
      const rows = [['1', '2']];

      const result = generator.generateAsciiTable(headers, rows);

      expect(typeof result).toBe('string');
      expect(result).toContain('A');
      expect(result).toContain('B');
    });

    it('generateAsciiTree should still work but is deprecated', () => {
      const root = { label: 'Root', children: [{ label: 'Child' }] };

      const result = generator.generateAsciiTree(root);

      expect(typeof result).toBe('string');
      expect(result).toContain('Root');
      expect(result).toContain('Child');
    });
  });
});

// ========================================
// v1.1.0 新機能テスト
// ========================================

describe('DiagramGenerator - v1.1.0 Advanced Diagrams', () => {
  let generator: DiagramGenerator;

  beforeEach(() => {
    generator = new DiagramGenerator();
  });

  describe('generateMermaidTimeline', () => {
    it('should generate timeline with title and events', () => {
      const data = {
        title: 'Project Timeline',
        events: [
          { period: '2025年1月', title: 'Phase 1 開始' },
          { period: '2025年3月', title: 'Phase 2 開始' },
          { period: '2025年6月', title: 'リリース' },
        ],
      };

      const result = generator.generateMermaidTimeline(data);

      expect(result).toContain('timeline');
      expect(result).toContain('title Project Timeline');
      expect(result).toContain('2025年1月 : Phase 1 開始');
      expect(result).toContain('2025年3月 : Phase 2 開始');
      expect(result).toContain('2025年6月 : リリース');
    });

    it('should generate timeline without title', () => {
      const data = {
        events: [
          { period: 'Q1', title: 'Planning' },
          { period: 'Q2', title: 'Development' },
        ],
      };

      const result = generator.generateMermaidTimeline(data);

      expect(result).toContain('timeline');
      expect(result).not.toContain('title');
      expect(result).toContain('Q1 : Planning');
    });

    it('should return empty string for empty events', () => {
      const data = { events: [] };

      const result = generator.generateMermaidTimeline(data);

      expect(result).toBe('');
    });
  });

  describe('generateMermaidGantt', () => {
    it('should generate gantt chart with tasks', () => {
      const data = {
        title: 'Project Schedule',
        tasks: [
          { id: 'task1', name: 'Design', start: '2025-01-01', duration: '7d' },
          { id: 'task2', name: 'Development', start: 'after task1', duration: '14d', status: 'active' as const },
          { id: 'task3', name: 'Testing', start: 'after task2', end: '2025-02-15', status: 'crit' as const },
        ],
      };

      const result = generator.generateMermaidGantt(data);

      expect(result).toContain('gantt');
      expect(result).toContain('title Project Schedule');
      expect(result).toContain('Design :task1, 2025-01-01, 7d');
      expect(result).toContain('Development :active, task2, after task1, 14d');
      expect(result).toContain('Testing :crit, task3, after task2, 2025-02-15');
    });

    it('should generate gantt with sections', () => {
      const data = {
        tasks: [
          { id: 't1', name: 'Task A', start: '2025-01-01', duration: '5d', section: 'Phase 1' },
          { id: 't2', name: 'Task B', start: '2025-01-06', duration: '5d', section: 'Phase 2' },
        ],
      };

      const result = generator.generateMermaidGantt(data);

      expect(result).toContain('section Phase 1');
      expect(result).toContain('section Phase 2');
    });

    it('should return empty string for empty tasks', () => {
      const data = { tasks: [] };

      const result = generator.generateMermaidGantt(data);

      expect(result).toBe('');
    });
  });

  describe('generateMermaidQuadrant', () => {
    it('should generate quadrant chart with all options', () => {
      const data = {
        title: 'Risk Matrix',
        xAxisLabel: { left: 'Low Probability', right: 'High Probability' },
        yAxisLabel: { bottom: 'Low Impact', top: 'High Impact' },
        quadrantLabels: {
          q1: 'Urgent',
          q2: 'Plan',
          q3: 'Low Priority',
          q4: 'Quick Win',
        },
        items: [
          { label: 'Risk A', x: 0.8, y: 0.9 },
          { label: 'Risk B', x: 0.3, y: 0.7 },
        ],
      };

      const result = generator.generateMermaidQuadrant(data);

      expect(result).toContain('quadrantChart');
      expect(result).toContain('title Risk Matrix');
      expect(result).toContain('x-axis Low Probability --> High Probability');
      expect(result).toContain('y-axis Low Impact --> High Impact');
      expect(result).toContain('quadrant-1 Urgent');
      expect(result).toContain('Risk A: [0.80, 0.90]');
      expect(result).toContain('Risk B: [0.30, 0.70]');
    });

    it('should clamp coordinates to 0-1 range', () => {
      const data = {
        items: [
          { label: 'Over', x: 1.5, y: -0.2 },
        ],
      };

      const result = generator.generateMermaidQuadrant(data);

      expect(result).toContain('Over: [1.00, 0.00]');
    });

    it('should return empty string for empty items', () => {
      const data = { items: [] };

      const result = generator.generateMermaidQuadrant(data);

      expect(result).toBe('');
    });
  });

  describe('generateMermaidMindmap', () => {
    it('should generate mindmap with nested structure', () => {
      const data = {
        root: {
          label: 'Main Topic',
          children: [
            {
              label: 'Branch 1',
              children: [
                { label: 'Leaf 1' },
                { label: 'Leaf 2' },
              ],
            },
            { label: 'Branch 2' },
          ],
        },
      };

      const result = generator.generateMermaidMindmap(data);

      expect(result).toContain('mindmap');
      expect(result).toContain('root((Main Topic))');
      expect(result).toContain('Branch 1');
      expect(result).toContain('Leaf 1');
      expect(result).toContain('Branch 2');
    });

    it('should handle node shapes', () => {
      const data = {
        root: {
          label: 'Center',
          shape: 'circle' as const,
          children: [
            { label: 'Square Node', shape: 'square' as const },
            { label: 'Cloud Node', shape: 'cloud' as const },
          ],
        },
      };

      const result = generator.generateMermaidMindmap(data);

      expect(result).toContain('((Center))');
      expect(result).toContain('[Square Node]');
      expect(result).toContain(')Cloud Node(');
    });

    it('should handle empty root label', () => {
      const data = { root: { label: '' } };

      const result = generator.generateMermaidMindmap(data);

      // Empty label still generates valid mindmap structure
      expect(result).toContain('mindmap');
      expect(result).toContain('root');
    });
  });
});