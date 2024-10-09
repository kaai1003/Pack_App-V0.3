import { Component, computed, OnInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { MatCardModule } from '@angular/material/card';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DisplayTopInfoComponent } from '../components/display-top-info/display-top-info.component';
import { DisplayEfficiencyGraphComponent } from '../components/display-efficiency-graph/display-efficiency-graph.component';
import { DisplayOutputGraphComponent } from '../components/display-output-graph/display-output-graph.component';
import { DisplayOutputPerRefComponent } from '../components/display-output-per-ref/display-output-per-ref.component';
import { formatDateDashes } from '../../utils/formatDate';
import { DisplayEfficiencyGaugeComponent } from '../components/display-efficiency-gauge/display-efficiency-gauge.component';
import { DisplayTopCardsComponent } from '../components/display-top-cards/display-top-cards.component';

Chart.register(ChartDataLabels);

@Component({
  selector: 'app-line-display',
  standalone: true,
  imports: [
    MatCardModule,
    DisplayTopInfoComponent,
    DisplayEfficiencyGraphComponent,
    DisplayOutputGraphComponent,
    DisplayOutputPerRefComponent,
    DisplayEfficiencyGaugeComponent,
    DisplayTopCardsComponent,
  ],
  templateUrl: './line-display.component.html',
  styleUrl: './line-display.component.css',
})
export class LineDisplayComponent implements OnInit {
  filterForm: FormGroup = this.formBuilder.group({
    from: [formatDateDashes(new Date()), Validators.required],
    to: [formatDateDashes(new Date()), Validators.required],
  });
  graphFilters = computed(() => ({
    from: formatDateDashes(this.filterForm.get('from')?.value),
    to: formatDateDashes(this.filterForm.get('to')?.value),
    temps_game: this.storageService.getItem('line_display_rangeTime'),
    vsm: this.storageService.getItem('available_operators'),
  }));

  constructor(
    private formBuilder: FormBuilder,
    public storageService: StorageService
  ) {}

  ngOnInit() {
    // Update filter dates every 10min
    setInterval(this.setDefaultDates, 10 * 60 * 1000);
    this.setDefaultDates();
  }

  setDefaultDates() {
    const currentDate = new Date();
    const currentHour = currentDate.getHours();

    let fromDate: Date;
    let toDate: Date;

    if (currentHour >= 22 || currentHour < 6) {
      // Shift C
      fromDate = new Date(currentDate);
      fromDate.setHours(22, 0, 0, 0);
      toDate = new Date(currentDate);
      if (currentHour < 6) {
        fromDate.setDate(fromDate.getDate() - 1); // Previous day 22:00
      } else {
        toDate.setDate(toDate.getDate() + 1); // Next day 06:00
      }
      toDate.setHours(6, 0, 0, 0);
    } else if (currentHour >= 6 && currentHour < 14) {
      // Shift A
      fromDate = new Date(currentDate);
      fromDate.setHours(6, 0, 0, 0);
      toDate = new Date(currentDate);
      toDate.setHours(14, 0, 0, 0);
    } else {
      // Shift B
      fromDate = new Date(currentDate);
      fromDate.setHours(14, 0, 0, 0);
      toDate = new Date(currentDate);
      toDate.setHours(22, 0, 0, 0);
    }

    this.filterForm.patchValue({
      from: formatDateDashes(fromDate),
      to: formatDateDashes(toDate), // shift: this.getCurrentShift(currentHour)
    });
  }
}
