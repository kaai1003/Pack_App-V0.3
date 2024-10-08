import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { LineDashboardService } from '../../../services/line.dashboard';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-display-efficiency-gauge',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './display-efficiency-gauge.component.html',
  styleUrl: './display-efficiency-gauge.component.css',
})
export class DisplayEfficiencyGaugeComponent implements OnInit {
  @Input() filters: any = {};
  efficiency = signal(0);

  constructor(public lineDashboardService: LineDashboardService) {}

  ngOnInit(): void {
    const ctx = document.getElementById('EfficiencyGauge') as HTMLCanvasElement;
    const chart = new Chart(ctx, {
      data: {
        datasets: [
          {
            type: 'doughnut',
            data: [this.efficiency(), 100 - this.efficiency()],
            borderColor: 'black',
            backgroundColor: ['rgba(25, 135, 84, 1)', 'white'],
          },
        ],
      },
      options: {
        rotation: -90, // start angle in radians
        circumference: 180, // sweep angle in radians
        animation: { duration: 0 },
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          datalabels: false,
          legend: {
            display: false,
            labels: { display: false },
          },
          title: {
            display: false,
          },
          tooltips: {
            display: false,
          },
        },
      },
    });

    const update = () => {
      this.lineDashboardService
        .getEfficiency(this.filters())
        .subscribe((data) => {
          let eff = data.average_efficiency;
          this.efficiency.set(data.average_efficiency);
          chart.data.datasets[0].data = [eff, 100 - eff];
          chart.update();
        });
    };

    setInterval(update, 2000);
    update();
  }
}
