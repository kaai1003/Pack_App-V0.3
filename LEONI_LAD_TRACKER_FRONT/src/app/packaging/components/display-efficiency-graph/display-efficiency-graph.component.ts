import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { LineDashboardService } from '../../../services/line.dashboard';

@Component({
  selector: 'app-display-efficiency-graph',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './display-efficiency-graph.component.html',
  styleUrl: './display-efficiency-graph.component.css',
})
export class DisplayEfficiencyGraphComponent implements OnInit {
  @Input() filters: any = {};

  constructor(public lineDashboardService: LineDashboardService) {}

  ngOnInit(): void {
    const ctx = document.getElementById('EfficiencyGraph') as HTMLCanvasElement;
    const chart = new Chart(ctx, {
      data: {
        labels: ['Efficiency Per Hour'], // Provide your labels
        datasets: [
          {
            type: 'line',
            label: 'Efficiency',
            data: [], // Provide your data
            borderWidth: 6,
            fill: false,
            borderColor: 'oklch(0.28 0.1 255.67)',
            tension: 0.1,
          },
          // {
          //   type: 'line',
          //   label: 'Target',
          //   data: [],
          //   fill: false,
          //   fillColor: 'red',
          //   borderColor: 'green',
          //   tension: 0.1,
          // },
        ],
      },
      options: {
        animation: { duration: 0 },
        scales: { y: { min: 0, max: 150 } },
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'top',
          }, // Adding label plugin here
          datalabels: {
            display: true,
            align: 'top',
            color: '#ff7514',
            font: {
              size: 16,
              weight: 'bold',
            },
            formatter: function (value: any) {
              return value.toFixed(2); // Format the value to 2 decimal places
            },
          },
        },
      },
      plugins: [ChartDataLabels], // Registering the Chart.js DataLabels plugin
    });

    const update = () => {
      this.lineDashboardService
        .getEfficiencyByHour(this.filters())
        .subscribe((data) => {
          chart.data.labels = data.map(
            (item) => item.hour + 'h -> ' + (item.hour + 1) + 'h'
          );
          chart.data.datasets[0].data = data.map((item) => item.efficiency);
          //chart.data.datasets[1].data = data.map((item) => 100);
          chart.update();
        });
    };

    setInterval(update, 2000);
    update();
  }
}
