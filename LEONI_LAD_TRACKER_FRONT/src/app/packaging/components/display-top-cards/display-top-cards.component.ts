import { CommonModule } from '@angular/common';
import { Component, computed, Input, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { StorageService } from '../../../services/storage.service';
import { LineDashboardService } from '../../../services/line.dashboard';

@Component({
  selector: 'app-display-top-cards',
  standalone: true,
  imports: [MatCardModule, CommonModule],
  templateUrl: './display-top-cards.component.html',
  styleUrl: './display-top-cards.component.css',
})
export class DisplayTopCardsComponent implements OnInit {
  @Input() filters: any = {};
  expected = signal(0);
  totalQuantity = signal(0);
  gap = computed(() => this.totalQuantity() - this.expected());

  constructor(
    public storageService: StorageService,
    public lineDashboardService: LineDashboardService
  ) {}

  ngOnInit(): void {
    const update = () => {
      let filters = this.filters();
      let from = new Date(filters.from);
      let hoursCount = new Date().getHours() - from.getHours() + 1;
      this.expected.set(
        (this.storageService.getItem('line_disply_target') * hoursCount) / 8
      );

      this.lineDashboardService
        .getTotalQuantity(this.filters())
        .subscribe((d) => {
          this.totalQuantity.set(d.total_quantity);
        });
    };

    setInterval(update, 2000);
    update();
  }
}
