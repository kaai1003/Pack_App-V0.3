import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayEfficiencyGraphComponent } from './display-efficiency-graph.component';

describe('DisplayEfficiencyGraphComponent', () => {
  let component: DisplayEfficiencyGraphComponent;
  let fixture: ComponentFixture<DisplayEfficiencyGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayEfficiencyGraphComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisplayEfficiencyGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
