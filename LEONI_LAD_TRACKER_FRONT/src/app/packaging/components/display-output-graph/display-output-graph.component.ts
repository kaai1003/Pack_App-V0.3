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

  formatDate(date: any): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const seconds = ('0' + d.getSeconds()).slice(-2);

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  ngOnInit(): void {
    const ctx = document.getElementById('OutputGraph') as HTMLCanvasElement;
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [''],
        datasets: [
          {
            label: 'Hourly Quantity',
            data: [10, 20, 30, 40], // Sample data
            borderColor: '#ff7514',
            backgroundColor: '#ff7514',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 0,
        },
        plugins: {
          legend: {
            position: 'top',
          }, // Adding label plugin here
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
          chart.data.labels = data.map(
            ({ hour }: HourlyEfficiency) => hour + 'h -> ' + (hour + 1) + 'h'
          );

          chart.data.datasets = [
            {
              label: 'Output per hour',
              data: data.map((item: HourlyEfficiency) => item.total_quantity),
              borderColor: '#ff7614a4',
              backgroundColor: '#ff7614a4',
              order: 2,
            },
            {
              label: 'Target per hour',
              data: [...data.map((_) => targetPerHour), 20],
              type: 'line',
              borderColor: 'rgba( 25, 135, 84, 1 )',
              backgroundColor: 'rgba( 25, 135, 84, 1 )', // this dataset is drawn on top
              order: 1,
            },
          ];
          chart.update();
        });
    };

    setInterval(update, 2000);
    update();
  }
}
