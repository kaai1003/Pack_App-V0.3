import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayTopInfoComponent } from './display-top-info.component';

describe('DisplayTopInfoComponent', () => {
  let component: DisplayTopInfoComponent;
  let fixture: ComponentFixture<DisplayTopInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayTopInfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisplayTopInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
