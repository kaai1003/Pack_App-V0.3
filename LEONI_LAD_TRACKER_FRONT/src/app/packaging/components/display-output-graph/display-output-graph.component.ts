import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  HourlyEfficiency,
  LineDashboardService,
} from '../../../services/line.dashboard';
import { StorageService } from '../../../services/storage.service';

@Component({
  selector: 'app-display-output-graph',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './display-output-graph.component.html',
  styleUrl: './display-output-graph.component.css',
})
export class DisplayOutputGraphComponent implements OnInit {
  @Input() filters: any = {};

  constructor(
    public lineDashboardService: LineDashboardService,
    public storageService: StorageService
  ) {}

  ngOnInit(): void {
    const ctx = document.getElementById('OutputGraph') as HTMLCanvasElement;
    const chart = new Chart(ctx, {
      data: {
        labels: ['Efficiency Per Hour'],
        datasets: [
          {
            type: 'bar',
            label: 'Output per hour',
            data: [],
            borderColor: '#ff7514',
            backgroundColor: '#ff7514',
            borderWidth: 1,
          },
        ],
      },
      options: {
        animation: { duration: 0 },
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          annotation: {
            annotations: {
              line1: {
                type: 'line',
                yMin: 0,
                yMax: 0,
                borderColor: 'green',
                borderWidth: 2,
                label: {
                  backgroundColor: 'green',
                  content: '0',
                  display: true,
                },
              },
            },
          },
          legend: {
            position: 'top',
          },
          datalabels: {
            display: true,
            align: 'center',
            color: 'oklch(0.28 0.1 255.67)',
            font: {
              size: 16,
              weight: 'bold',
            },
            formatter: function (value: any) {
              return value; // Return value to show inside the chart
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
          const targetPerHour =
            this.storageService.getItem('line_disply_target') / 8;
          chart.options.plugins.annotation.annotations.line1.yMin =
            targetPerHour;
          chart.options.plugins.annotation.annotations.line1.yMax =
            targetPerHour;
          chart.options.plugins.annotation.annotations.line1.label.content = `Target: ${targetPerHour}`;

          chart.data.labels = data.map(
            (item) => item.hour + 'h -> ' + (item.hour + 1) + 'h'
          );
          chart.data.datasets[0].data = data.map((item) => item.total_quantity);

          chart.update();
        });
    };

    setInterval(update, 2000);
    update();
  }
}
