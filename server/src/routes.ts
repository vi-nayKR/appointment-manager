import { Router } from 'express';
import type { Db } from 'mongodb';
import { listReferences } from './appointments.repository.ts';
import { createOne, deleteOne, getOne, listDay, updateOne } from './appointments.service.ts';
import { parseCreate, parseListQuery, parsePatch } from './validation.ts';

export function routes(db: Db) {
  const router = Router();
  router.get('/appointments', async (req, res) => {
    res.json(await listDay(db, parseListQuery(req.query as Record<string, unknown>)));
  });
  router.post('/appointments', async (req, res) => {
    const appointment = await createOne(db, parseCreate(req.body));
    res.location(`/api/appointments/${appointment.id}`).status(201).json(appointment);
  });
  router.get('/appointments/:id', async (req, res) => {
    res.json(await getOne(db, req.params['id']!));
  });
  router.patch('/appointments/:id', async (req, res) => {
    res.json(await updateOne(db, req.params['id']!, parsePatch(req.body)));
  });
  router.delete('/appointments/:id', async (req, res) => {
    await deleteOne(db, req.params['id']!);
    res.status(204).end();
  });
  router.get('/providers', async (_req, res) => res.json(await listReferences(db, 'providers')));
  router.get('/chairs', async (_req, res) => res.json(await listReferences(db, 'chairs')));
  return router;
}
