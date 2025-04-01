import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SociedadesComponent } from './sociedades.component';

describe('SociedadesComponent', () => {
  let component: SociedadesComponent;
  let fixture: ComponentFixture<SociedadesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SociedadesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SociedadesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
