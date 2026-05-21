const pptxgen = require('pptxgenjs');
const path = require('path');
const html2pptx = require(path.resolve('C:/Users/hj.moon/.claude/plugins/cache/anthropic-agent-skills/document-skills/69c0b1a06741/skills/pptx/scripts/html2pptx.js'));

const SLIDES_DIR = path.resolve('D:/ELUO_SYS/docs/slides');
const OUTPUT = path.resolve('D:/ELUO_SYS/docs/ELUO_SYS_소개.pptx');

async function build() {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = 'ELUO C&C';
  pptx.title = 'ELUO SYS - On-Premise AI Agency Platform';
  pptx.subject = 'Product Introduction';

  // Slide 1: Cover
  console.log('Processing slide 1 (Cover)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide01.html'), pptx);

  // Slide 2: Problem Definition
  console.log('Processing slide 2 (Problem)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide02.html'), pptx);

  // Slide 3: Market Trend (with chart)
  console.log('Processing slide 3 (Market Trend)...');
  const { slide: slide3, placeholders: ph3 } = await html2pptx(path.join(SLIDES_DIR, 'slide03.html'), pptx);

  // Market growth chart
  const marketChart = ph3.find(p => p.id === 'market-chart');
  if (marketChart) {
    slide3.addChart(pptx.charts.BAR, [{
      name: 'AI Agent Market ($B)',
      labels: ['2025', '2026', '2027', '2028', '2029', '2030'],
      values: [7.8, 11.4, 16.7, 24.4, 35.7, 52.6]
    }], {
      ...marketChart,
      barDir: 'col',
      showTitle: true,
      title: 'AI Agent Market Size ($B)',
      titleColor: '1C2833',
      titleFontSize: 10,
      showLegend: false,
      showCatAxisTitle: false,
      showValAxisTitle: true,
      valAxisTitle: 'Billions ($)',
      valAxisMinVal: 0,
      valAxisMaxVal: 60,
      valAxisMajorUnit: 10,
      catAxisFontSize: 8,
      valAxisFontSize: 8,
      dataLabelPosition: 'outEnd',
      dataLabelFontSize: 7,
      dataLabelColor: '1C2833',
      chartColors: ['2E86AB']
    });
  }

  // Slide 4: Competitive Landscape
  console.log('Processing slide 4 (Competition)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide04.html'), pptx);

  // Slide 5: Solution Overview (6-Layer Architecture)
  console.log('Processing slide 5 (Architecture)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide05.html'), pptx);

  // Slide 6: Core Features (19 Domains)
  console.log('Processing slide 6 (Features)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide06.html'), pptx);

  // Slide 7: Tech Stack
  console.log('Processing slide 7 (Tech Stack)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide07.html'), pptx);

  // Slide 8: Pipeline
  console.log('Processing slide 8 (Pipeline)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide08.html'), pptx);

  // Slide 9: Cost Comparison (with chart)
  console.log('Processing slide 9 (Cost)...');
  const { slide: slide9, placeholders: ph9 } = await html2pptx(path.join(SLIDES_DIR, 'slide09.html'), pptx);

  const costChart = ph9.find(p => p.id === 'cost-chart');
  if (costChart) {
    slide9.addChart(pptx.charts.BAR, [{
      name: 'Monthly Cost ($)',
      labels: ['SaaS Combo\n(5 tools)', 'ELUO SYS'],
      values: [300, 60]
    }], {
      ...costChart,
      barDir: 'col',
      showTitle: true,
      title: 'Monthly Cost Comparison (5 users)',
      titleColor: '1C2833',
      titleFontSize: 10,
      showLegend: false,
      showCatAxisTitle: false,
      showValAxisTitle: true,
      valAxisTitle: 'USD / month',
      valAxisMinVal: 0,
      valAxisMaxVal: 350,
      valAxisMajorUnit: 50,
      catAxisFontSize: 9,
      valAxisFontSize: 8,
      dataLabelPosition: 'outEnd',
      dataLabelFontSize: 10,
      dataLabelColor: '1C2833',
      chartColors: ['C0392B', '2E86AB']
    });
  }

  // Slide 10: Dashboard
  console.log('Processing slide 10 (Dashboard)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide10.html'), pptx);

  // Slide 11: Roadmap
  console.log('Processing slide 11 (Roadmap)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide11.html'), pptx);

  // Slide 12: Q&A
  console.log('Processing slide 12 (Q&A)...');
  await html2pptx(path.join(SLIDES_DIR, 'slide12.html'), pptx);

  // Save
  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`\nPresentation saved to: ${OUTPUT}`);
  console.log('Total slides: 12');
}

build().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
