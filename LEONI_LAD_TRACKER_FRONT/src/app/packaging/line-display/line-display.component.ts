import { Component, computed, OnDestroy, OnInit } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import Chart from 'chart.js/auto';
import { MatCardModule } from '@angular/material/card';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  HourlyEfficiency,
  LineDashboardService,
} from '../../services/line.dashboard';
import { MatDialog } from '@angular/material/dialog';
import { LineDisplayDialogComponent } from '../line-display-dialog/line-display-dialog.component';
import {
  BoxCount,
  CountBoxPerHourLineDto,
  CountHourLineDto,
  HourProduitsDTO,
  refQuantityDto,
} from '../../dtos/Line.dashboard.dto';
import { StorageService } from '../../services/storage.service';
import { SegmentService } from '../../services/segment.service';
import { ProductionLineService } from '../../services/production.line.service';
import { BehaviorSubject } from 'rxjs';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DisplayTopInfoComponent } from '../components/display-top-info/display-top-info.component';
import { DisplayEfficiencyGraphComponent } from '../components/display-efficiency-graph/display-efficiency-graph.component';
import { DisplayOutputGraphComponent } from '../components/display-output-graph/display-output-graph.component';
import { DisplayOutputPerRefComponent } from '../components/display-output-per-ref/display-output-per-ref.component';

Chart.register(ChartDataLabels);

@Component({
  selector: 'app-line-display',
  standalone: true,
  imports: [
    BaseChartDirective,
    MatCardModule,
    ReactiveFormsModule,
    RouterOutlet,
    CommonModule,
    DisplayTopInfoComponent,
    DisplayEfficiencyGraphComponent,
    DisplayOutputGraphComponent,
    DisplayOutputPerRefComponent
  ],
  templateUrl: './line-display.component.html',
  styleUrl: './line-display.component.css',
})
export class LineDisplayComponent implements OnInit, OnDestroy {
  totalQuantity: number = 0;
  countPackages: number = 0;
  efficiency: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  countFxPerHour: CountHourLineDto[] = [];
  countOfPackagePerHour: CountBoxPerHourLineDto[] = [];
  hourProduits: HourProduitsDTO = new HourProduitsDTO(0, 0, 0, 0);
  filterForm: FormGroup = this.formBuilder.group({
    from: [this.formatDate(new Date()), Validators.required],
    to: [this.formatDate(new Date()), Validators.required],
  });
  InProgress: number = 0;
  intervalId: any;
  line: BehaviorSubject<string> = new BehaviorSubject<string>('');
  project: BehaviorSubject<string> = new BehaviorSubject<string>('');
  efficiencyPerHour: BehaviorSubject<HourlyEfficiency[]> = new BehaviorSubject<
    HourlyEfficiency[]
  >([]);
  graphFilters = computed(() => ({
    from: this.formatDate(this.filterForm.get('from')?.value),
    to: this.formatDate(this.filterForm.get('to')?.value),
    temps_game: this.storageService.getItem('line_disply_rangeTime'),
    vsm: this.storageService.getItem('availible_operators'),
  }));

  constructor(
    private formBuilder: FormBuilder,
    private lineDashboardService: LineDashboardService,
    public dialog: MatDialog,
    public storageService: StorageService,
    public router: Router,
    private SegemntService: SegmentService,
    private productionLineService: ProductionLineService
  ) {}

  ngOnInit() {
    this.setDefaultDates();
    this.getInitData();
    setInterval(() => {
      this.reloadCurrentPage();
    }, 3000); // 3 seconds
  }

  reloadCurrentPage() {
    this.router
      .navigateByUrl('/packaging/report', { skipLocationChange: true })
      .then(() => {
        this.router.navigate([this.router.url]).then(() => {
          // Set the page to
          this.countFxPerHour;
        });
      });
  }

  // Clear the interval when the component is destroyed
  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
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
      from: this.formatDate(fromDate),
      to: this.formatDate(toDate), // shift: this.getCurrentShift(currentHour)
    });
  }

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

  /**
   *
   */
  getInitData(): void {
    const filters = {
      from: this.formatDate(this.filterForm.get('from')?.value),
      to: this.formatDate(this.filterForm.get('to')?.value),
      temps_game: this.storageService.getItem('line_disply_rangeTime'),
      vsm: this.storageService.getItem('availible_operators'),
    };

    this.lineDashboardService.getBoxCount(filters).subscribe(
      (data: BoxCount) => {
        this.countPackages = data.box_count;
        // Update other data and charts as needed
      },
      (error) => {
        console.error('Error fetching total quantity:', error);
      }
    );

    this.lineDashboardService.getEfficiency(filters).subscribe(
      (data: any) => {
        // alert(data)
        this.efficiency.next(data.average_efficiency);
        // Update other data and charts as needed
      },
      (error) => {
        console.error('Error fetching total efficiency:', error);
      }
    );

    this.lineDashboardService.getCountOfPackageByHour(filters).subscribe(
      (data: any) => {
        this.countOfPackagePerHour = data;
        // Update other data and charts as needed
      },
      (error) => {
        console.error('Error fetching total quantity:', error);
      }
    );

    this.lineDashboardService.getHourProduitsDTO(filters).subscribe(
      (data: any) => {
        this.hourProduits = data;
        // Update other data and charts as needed
      },
      (error) => {
        console.error('Error fetching total quantity:', error);
      }
    );

    this.lineDashboardService.getQuantityByHour(filters).subscribe(
      (data: any) => {
        this.countFxPerHour = data;
      },
      (error) => {
        console.error('Error fetching hourly quantity:', error);
      }
    );

    this.lineDashboardService.getInProgressQantity(filters).subscribe(
      (data: any) => {
        this.InProgress = data.total_quantity;
      },
      (error) => {
        console.error(':', error);
      }
    );
    this.lineDashboardService.getEfficiencyByHour(filters).subscribe(
      (data: any) => {
        this.efficiencyPerHour.next(data);
      },
      (error) => {
        console.error(':', error);
      }
    );

    this.lineDashboardService.getTotalQuantity(filters).subscribe(
      (data: any) => {
        this.totalQuantity = data.total_quantity;
        // Update other data and charts as needed
      },
      (error) => {
        console.error('Error fetching total quantity:', error);
      }
    );

    setTimeout(() => {
      this.onFilter();
    }, 5000);
  }

  onFilter() {
    this.getInitData();
  }

  openDialog(): void {
    this.dialog.open(LineDisplayDialogComponent, {
      width: '50%',
      data: {
        /* pass any data here if needed */
      },
    });
  }

  getEcartColorAndArrow(): { colorClass: string; arrow: string } {
    const ecart = this.calculateExpected() - this.totalQuantity;
    if (ecart > 0) {
      return { colorClass: 'text-danger fw-bold', arrow: '↓' };
    } else if (ecart < 0) {
      return { colorClass: 'text-success fw-bold', arrow: '↑' };
    } else {
      return { colorClass: '', arrow: '' }; // Default or no change needed
    }
  }

  /**
   * print the report
   */
  printReport(): void {
    window.print();
  }

  /**
   *
   * @returns target in line
   */
  getOpbjectif(): number {
    // const rangeTime = this.storageService.getItem("rangeTime")
    // const operators = this.storageService.getItem("operatores")
    const gole = this.storageService.getItem('line_disply_target')
      ? this.storageService.getItem('line_disply_target')
      : 0;
    // let objectif = (operators * this.hourProduits.posted_hours) / rangeTime
    return parseInt(gole);
  }

  /**
   *
   * @returns expected of to delever
   */
  calculateExpected() {
    let start = new Date(this.formatDate(this.filterForm.get('from')?.value));
    let to = new Date();
    let hourCoutn = 0;
    do {
      let hourInApiHours = this.countFxPerHour.find(
        (hour) => hour.hour == start.getHours()
      );
      hourCoutn++;
      start.setHours(start.getHours() + 1);
    } while (start < to);

    return (this.storageService.getItem('line_disply_target') / 8) * hourCoutn;
  }

  getDeliveredClass() {
    //  return this.totalQuantity >= this.calculateExpected() ? ' text-success': 'text-danger';
    return this.totalQuantity >= this.calculateExpected()
      ? ' success-glass'
      : 'success-glass';
  }

  getFormattedDifference(): string {
    const difference = this.totalQuantity - this.calculateExpected();
    const formattedDifference = difference.toFixed(0); // Ensure one decimal place
    return difference > 0 ? `${formattedDifference}` : `${formattedDifference}`;
  }
}
