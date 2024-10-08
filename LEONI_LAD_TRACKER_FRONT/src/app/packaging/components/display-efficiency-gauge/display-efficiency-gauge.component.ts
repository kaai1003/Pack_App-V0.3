import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { LineDashboardService } from '../../../services/line.dashboard';

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
    const update = () => {
      this.lineDashboardService
        .getEfficiency(this.filters())
        .subscribe((data) => {
          this.efficiency.set(data.average_efficiency);
        });
    };

    setInterval(update, 2000);
    update();
  }
}
