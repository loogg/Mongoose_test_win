import { useEffect, useRef } from 'preact/hooks';
import Chart from 'chart.js/auto';

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
  const chartRef = useRef<Chart | null>(null);

  const formatTimeOnly = (timestamp: number): string => {
    const date = new Date((timestamp + tzOffset * 3600) * 1000);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const rgbColor = color.match(/\d+/g);
    const [r, g, b] = rgbColor ? rgbColor.map(Number) : [59, 130, 246];

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.timestamp !== undefined ? formatTimeOnly(d.timestamp) : d.index),
        datasets: [{
          label: label,
          data: data.map(d => d.value),
          borderColor: color,
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: color,
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(31, 41, 55, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context) => `${context.parsed.y}${unit}`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: '#e5e7eb',
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 11,
              },
              maxRotation: 45,
              minRotation: 45,
            },
          },
          y: {
            display: true,
            min: 0,
            max: 100,
            grid: {
              color: '#e5e7eb',
            },
            ticks: {
              color: '#9ca3af',
              font: {
                size: 11,
              },
              callback: (value) => `${value}${unit}`,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    });

    chartRef.current = chart;

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, color, label, unit, tzOffset]);

  return (
    <div class="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} />
    </div>
  );
}
