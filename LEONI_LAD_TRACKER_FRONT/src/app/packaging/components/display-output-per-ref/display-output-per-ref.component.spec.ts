import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayOutputPerRefComponent } from './display-output-per-ref.component';

describe('DisplayOutputPerRefComponent', () => {
  let component: DisplayOutputPerRefComponent;
  let fixture: ComponentFixture<DisplayOutputPerRefComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayOutputPerRefComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisplayOutputPerRefComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
