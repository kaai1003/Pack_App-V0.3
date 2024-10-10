import { Component, computed, signal } from '@angular/core';
import { formatDateDashes } from '../../utils/formatDate';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../../services/storage.service';
import { MatCardModule } from '@angular/material/card';
import { DisplayTopInfoComponent } from '../components/display-top-info/display-top-info.component';
import { DisplayEfficiencyGraphComponent } from '../components/display-efficiency-graph/display-efficiency-graph.component';
import { DisplayOutputGraphComponent } from '../components/display-output-graph/display-output-graph.component';
import { DisplayOutputPerRefComponent } from '../components/display-output-per-ref/display-output-per-ref.component';
import { DisplayEfficiencyGaugeComponent } from '../components/display-efficiency-gauge/display-efficiency-gauge.component';
import { DisplayTopCardsComponent } from '../components/display-top-cards/display-top-cards.component';
import {
  MatNativeDateModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_FORM_FIELD_DEFAULT_OPTIONS,
  MatFormFieldModule,
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-line-report',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    DisplayTopInfoComponent,
    DisplayEfficiencyGraphComponent,
    DisplayOutputGraphComponent,
    DisplayOutputPerRefComponent,
    DisplayEfficiencyGaugeComponent,
    DisplayTopCardsComponent,
  ],
  providers: [
    provideNativeDateAdapter(),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: {
        subscriptSizing: 'dynamic',
      },
    },
  ],
  templateUrl: './line-report.component.html',
  styleUrl: './line-report.component.css',
})
export class LineReportComponent {
  selectedDay = signal(new Date());
  startHour = signal(6);
  endHour = signal(14);

  fromDate = computed(() => {
    let d = new Date(this.selectedDay());
    d.setHours(this.startHour());
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return formatDateDashes(d);
  });

  toDate = computed(() => {
    let d = new Date(this.selectedDay());
    d.setHours(this.endHour());
    d.setMinutes(0);
    d.setSeconds(0);
    d.setMilliseconds(0);
    return formatDateDashes(d);
  });

  graphFilters = computed(() => ({
    from: formatDateDashes(this.fromDate()),
    to: formatDateDashes(this.toDate()),
    temps_game: this.storageService.getItem('line_display_rangeTime'),
    vsm: this.storageService.getItem('available_operators'),
  }));

  constructor(public storageService: StorageService) {}
}
