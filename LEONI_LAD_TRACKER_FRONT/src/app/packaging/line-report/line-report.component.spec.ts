import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LineReportComponent } from './line-report.component';

describe('LineReportComponent', () => {
  let component: LineReportComponent;
  let fixture: ComponentFixture<LineReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LineReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
