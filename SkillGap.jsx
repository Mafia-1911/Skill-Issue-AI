import React, { useState } from 'react';
import { Zap, Search, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

const SkillGap = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setShowResults(true);
    }, 2000);
  };

  const resetGoal = () => {
    setShowResults(false);
    setIsScanning(false);
  };

  return (
    <div style={{ padding: '40px', background: '#000000', color: '#FFFFFF', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
            <p style={{ color: '#FF6B00', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: '1px' }}>Manager Agent Output</p>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, textTransform: 'uppercase' }}>Strategy Dashboard</h1>
          </div>
          <button onClick={resetGoal} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', textTransform: 'uppercase' }}>
            ← Reset Goal
          </button>
        </header>

        {!showResults && !isScanning && (
          <div onClick={handleScan} style={{ padding: '60px', border: '1px solid #1E1E1E', borderRadius: '16px', background: '#0A0A0A', textAlign: 'center', cursor: 'pointer', transition: 'border 0.3s' }}>
            <Zap size={40} color="#FF6B00" style={{ marginBottom: '20px' }} />
            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Initialize Skill Analysis</h2>
            <p style={{ color: '#666' }}>Click to trigger the Advisor Agent feedback loop.</p>
          </div>
        )}

        {isScanning && (
          <div style={{ padding: '40px', background: '#0A0A0A', borderRadius: '20px', borderLeft: '4px solid #FF6B00', marginBottom: '30px' }}>
            <p style={{ color: '#666', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Active Milestone</p>
            <h2 style={{ fontSize: '48px', fontStyle: 'italic', margin: 0, display: 'flex', alignItems: 'center', gap: '20px' }}>
              Loading... <RefreshCw className="spin" size={32} color="#FF6B00" />
            </h2>
          </div>
        )}

        {showResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '30px', background: '#0A0A0A', borderRadius: '20px', border: '1px solid #1E1E1E' }}>
              <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
                <div style={{ background: '#FF6B00', color: '#000', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>1</div>
                <div style={{ width: '100%' }}>
                  <h3 style={{ fontSize: '20px', margin: '0 0 10px 0' }}>Skill Gap Analysis</h3>
                  <p style={{ color: '#666', lineHeight: '1.5', margin: 0 }}>
                    Comparing current repository stats against industry benchmarks for <span style={{ color: '#FF6B00' }}>Full Stack Developer</span>.
                  </p>
                  
                  <div style={{ marginTop: '25px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div style={{ padding: '15px', background: '#111', borderRadius: '12px', border: '1px solid #1a2e1a' }}>
                      <p style={{ color: '#4ade80', fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0' }}>✓ MATCHED</p>
                      <p style={{ fontSize: '14px', margin: 0 }}>React, Node.js, SQL</p>
                    </div>
                    <div style={{ padding: '15px', background: '#111', borderRadius: '12px', border: '1px solid #2e1a1a' }}>
                      <p style={{ color: '#f87171', fontSize: '12px', fontWeight: 'bold', margin: '0 0 8px 0' }}>! MISSING</p>
                      <p style={{ fontSize: '14px', margin: 0 }}>Docker, Redis, CI/CD</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '30px', background: '#0A0A0A', borderRadius: '20px', border: '1px solid #1E1E1E', opacity: 0.4 }}>
              <div style={{ display: 'flex', gap: '25px', alignItems: 'flex-start' }}>
                <div style={{ border: '1px solid #333', color: '#666', width: '35px', height: '35px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>2</div>
                <div>
                  <h3 style={{ fontSize: '20px', margin: '0 0 10px 0', color: '#666' }}>Scheduler Hand-off</h3>
                  <p style={{ color: '#444', fontSize: '14px' }}>Waiting for Scheduler Agent to generate optimal learning windows.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SkillGap;