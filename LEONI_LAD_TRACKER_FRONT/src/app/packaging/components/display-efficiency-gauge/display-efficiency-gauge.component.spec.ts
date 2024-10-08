import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayEfficiencyGaugeComponent } from './display-efficiency-gauge.component';

describe('DisplayEfficiencyGaugeComponent', () => {
  let component: DisplayEfficiencyGaugeComponent;
  let fixture: ComponentFixture<DisplayEfficiencyGaugeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayEfficiencyGaugeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisplayEfficiencyGaugeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
