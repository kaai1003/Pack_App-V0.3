import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayOutputGraphComponent } from './display-output-graph.component';

describe('DisplayOutputGraphComponent', () => {
  let component: DisplayOutputGraphComponent;
  let fixture: ComponentFixture<DisplayOutputGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayOutputGraphComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisplayOutputGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
