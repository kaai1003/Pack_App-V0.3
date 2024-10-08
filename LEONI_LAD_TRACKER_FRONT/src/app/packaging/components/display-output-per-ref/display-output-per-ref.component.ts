import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { refQuantityDto } from '../../../dtos/Line.dashboard.dto';
import { LineDashboardService } from '../../../services/line.dashboard';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-display-output-per-ref',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './display-output-per-ref.component.html',
  styleUrl: './display-output-per-ref.component.css',
})
export class DisplayOutputPerRefComponent implements OnInit {
  @Input() filters: any = {};
  countFxPerRef: refQuantityDto[] = [];
  constructor(public lineDashboardService: LineDashboardService) {}

  ngOnInit(): void {
    const update = () => {
      this.lineDashboardService
        .getCountByCodeFournisseur(this.filters())
        .subscribe((data) => {
          this.countFxPerRef = data;
        });
    };

    setInterval(update, 2000);
    update();
  }
}
