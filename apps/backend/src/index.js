const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'OneASHA Backend' });
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// API for Web Dashboard
app.get('/api/workers', async (req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { role: 'ASHA' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workers', async (req, res) => {
  try {
    const { name, phone, village, password } = req.body;
    const worker = await prisma.user.create({
      data: {
        name,
        phone,
        password, // Store assigned password
        role: 'ASHA',
      }
    });
    // Don't send password back
    const { password: _, ...workerWithoutPassword } = worker;
    res.json(workerWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Secure Login API
app.get('/api/seed-admin', async (req, res) => {
  try {
    const admin = await prisma.user.upsert({
      where: { phone: 'admin' },
      update: {},
      create: {
        name: 'System Admin',
        phone: 'admin',
        password: 'admin',
        role: 'ADMIN'
      }
    });
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid phone number or PIN.' });
    }

    const { password: _, ...workerWithoutPassword } = user;
    res.json(workerWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patients API
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      include: { worker: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const patientsData = Array.isArray(req.body) ? req.body : [req.body];
    
    const saved = [];
    for (const p of patientsData) {
      // Resolve workerId: use the one from the mobile app, or find by name
      let resolvedWorkerId = p.workerId;
      
      if (!resolvedWorkerId) {
        // Last resort: use the first ASHA worker in the system
        const fallback = await prisma.user.findFirst({ where: { role: 'ASHA' } });
        resolvedWorkerId = fallback?.id;
      }
      
      if (!resolvedWorkerId) {
        return res.status(400).json({ error: 'No workers exist to assign this patient to.' });
      }

      // Skip duplicates (same name + age + workerId already exists)
      const existing = await prisma.patient.findFirst({
        where: { name: p.name, age: p.age, workerId: resolvedWorkerId }
      });
      if (existing) { saved.push(existing); continue; }

      const patient = await prisma.patient.create({
        data: {
          name: p.name,
          age: p.age,
          phone: p.phone || null,
          address: p.address || null,
          riskFactor: p.riskFactor || null,
          workerId: resolvedWorkerId
        }
      });
      saved.push(patient);
    }
    
    res.json({ success: true, count: saved.length, data: saved });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patients for a specific worker (for mobile app My Patients screen)
app.get('/api/patients/worker/:workerId', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { workerId: req.params.workerId },
      include: { interventions: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log an intervention (called from Admin Dashboard)
app.post('/api/interventions', async (req, res) => {
  try {
    const { patientId, notes, followUpDate } = req.body;

    // Save the intervention
    const intervention = await prisma.intervention.create({
      data: { patientId, notes, followUpDate }
    });

    // Update patient status to "Action Taken"
    await prisma.patient.update({
      where: { id: patientId },
      data: { status: 'Action Taken' }
    });

    res.json({ success: true, intervention });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get follow-up reminders for a specific worker (for mobile app Today's Follow-ups)
app.get('/api/reminders/:workerId', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const interventions = await prisma.intervention.findMany({
      where: {
        patient: { workerId: req.params.workerId },
        followUpDate: { gte: today }
      },
      include: { patient: true },
      orderBy: { followUpDate: 'asc' }
    });
    res.json(interventions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync Engine Endpoints (WatermelonDB compatible)
const { pullChanges, pushChanges } = require('./sync');
app.get('/sync', pullChanges);
app.post('/sync', pushChanges);

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
