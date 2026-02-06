import { useEffect, useRef } from 'preact/hooks';

interface DataPoint {
  index: number;
  value: number;
  timestamp?: number;
}

interface MemoryChartProps {
  data: DataPoint[];
  color: string;
  label: string;
  unit?: string;
  tzOffset?: number;
}

export function MemoryChart({ data, color, label, unit = '%', tzOffset = 0 }: MemoryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverDataRef = useRef<{ x: number; y: number; value: number; time: string } | null>(null);

  const formatTimeOnly = (timestamp: number): string => {
    const date = new Date((timestamp + tzOffset * 3600) * 1000);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rgbColor = color.match(/\d+/g);
    const [r, g, b] = rgbColor ? rgbColor.map(Number) : [59, 130, 246];

    const drawChart = () => {
      const width = canvas.width;
      const height = canvas.height;
      const padding = { top: 30, right: 50, bottom: 30, left: 50 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;

      ctx.clearRect(0, 0, width, height);

      const xData = data.map(d => d.timestamp !== undefined ? d.timestamp : d.index);
      const yData = data.map(d => d.value);
      const xMin = Math.min(...xData);
      const xMax = Math.max(...xData);
      const yMin = 0;
      const yMax = 100;

      const xScale = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * chartWidth;
      const yScale = (val: number) => height - padding.bottom - ((val - yMin) / (yMax - yMin)) * chartHeight;

      const getX = (i: number) => xScale(xData[i]);
      const getY = (val: number) => yScale(val);

      const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      for (let i = 0; i <= 5; i++) {
        const y = padding.top + (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
      }

      for (let i = 0; i <= 10; i++) {
        const x = padding.left + (i / 10) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(getX(0), getY(yData[0]));
      for (let i = 1; i < yData.length; i++) {
        ctx.lineTo(getX(i), getY(yData[i]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(getX(yData.length - 1), height - padding.bottom);
      ctx.lineTo(getX(0), height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      yData.forEach((val, i) => {
        const x = getX(i);
        const y = getY(val);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      for (let i = 0; i <= 5; i++) {
        const val = (5 - i) * 20;
        const y = padding.top + (i / 5) * chartHeight;
        ctx.fillText(`${val}%`, padding.left - 10, y);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i <= 10; i++) {
        const x = padding.left + (i / 10) * chartWidth;
        const timeIndex = Math.floor((i / 10) * (xData.length - 1));
        const time = xData[timeIndex] !== undefined && typeof xData[timeIndex] === 'number' ? formatTimeOnly(xData[timeIndex]) : '';
        ctx.fillText(time, x, height - padding.bottom + 15);
      }
    };

    const resizeCanvas = () => {
      if (canvas && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        drawChart();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvas || data.length === 0) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;

      const padding = { top: 30, right: 50, bottom: 30, left: 50 };
      const chartWidth = canvas.width - padding.left - padding.right;
      const chartHeight = canvas.height - padding.top - padding.bottom;

      const xData = data.map(d => d.timestamp !== undefined ? d.timestamp : d.index);
      const yData = data.map(d => d.value);
      const xMin = Math.min(...xData);
      const xMax = Math.max(...xData);
      const yMin = 0;
      const yMax = 100;

      const xScale = (val: number) => padding.left + ((val - xMin) / (xMax - xMin)) * chartWidth;
      const yScale = (val: number) => canvas.height - padding.bottom - ((val - yMin) / (yMax - yMin)) * chartHeight;

      let closestIndex = -1;
      let minDist = Infinity;

      for (let i = 0; i < xData.length; i++) {
        const x = xScale(xData[i]);
        const dist = Math.abs(mouseX - x);
        if (dist < minDist) {
          minDist = dist;
          closestIndex = i;
        }
      }

      if (closestIndex >= 0 && minDist < 20) {
        const x = xScale(xData[closestIndex]);
        const y = yScale(yData[closestIndex]);
        const value = yData[closestIndex];
        const point = data[closestIndex];
        const time = point.timestamp !== undefined ? formatTimeOnly(point.timestamp) : `#${closestIndex}`;

        hoverDataRef.current = { x, y, value, time };
        drawChart();

        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, canvas.height - padding.bottom);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        const tooltipWidth = 140;
        const tooltipHeight = 50;
        let tooltipX = x + 10;
        if (tooltipX + tooltipWidth > canvas.width) {
          tooltipX = x - tooltipWidth - 10;
        }

        ctx.fillStyle = 'rgba(31, 41, 55, 0.95)';
        ctx.beginPath();
        ctx.roundRect(tooltipX, y - tooltipHeight - 10, tooltipWidth, tooltipHeight, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillText(time, tooltipX + 12, y - tooltipHeight);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${label}: ${value}${unit}`, tooltipX + 12, y - tooltipHeight + 20);
      } else {
        hoverDataRef.current = null;
        drawChart();
      }
    };

    const handleMouseLeave = () => {
      hoverDataRef.current = null;
      drawChart();
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [data, color, label, unit, tzOffset]);

  return (
    <div ref={containerRef} class="w-full" style={{ height: '288px' }}>
      <canvas ref={canvasRef} class="w-full h-full" />
    </div>
  );
}
