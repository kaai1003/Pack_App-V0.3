import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisplayTopCardsComponent } from './display-top-cards.component';

describe('DisplayTopCardsComponent', () => {
  let component: DisplayTopCardsComponent;
  let fixture: ComponentFixture<DisplayTopCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisplayTopCardsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DisplayTopCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
