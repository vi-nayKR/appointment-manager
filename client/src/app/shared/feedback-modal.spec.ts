import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackModal } from './feedback-modal';

describe('FeedbackModal', () => {
  it('renders a destructive confirmation and emits only the chosen action', async () => {
    await TestBed.configureTestingModule({ imports: [FeedbackModal] }).compileComponents();
    const fixture = TestBed.createComponent(FeedbackModal);
    const confirmed = vi.fn();
    const dismissed = vi.fn();
    fixture.componentInstance.open = true;
    fixture.componentInstance.mode = 'confirm';
    fixture.componentInstance.title = 'Delete appointment?';
    fixture.componentInstance.message = 'This cannot be undone.';
    fixture.componentInstance.confirmLabel = 'Delete appointment';
    fixture.componentInstance.confirmed.subscribe(confirmed);
    fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog');
    expect(dialog?.getAttribute('role')).toBe('alertdialog');
    expect(dialog?.querySelector('.warning-icon svg')).toBeTruthy();
    expect(dialog?.textContent).toContain('This cannot be undone.');

    fixture.nativeElement.querySelector('.cancel-button').click();
    expect(dismissed).toHaveBeenCalledOnce();
    expect(confirmed).not.toHaveBeenCalled();

    fixture.nativeElement.querySelector('.confirm-button').click();
    expect(confirmed).toHaveBeenCalledOnce();
  });
});
