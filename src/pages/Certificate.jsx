import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { FiDownload, FiShare2, FiArrowLeft, FiLock } from "react-icons/fi";
import { RiShieldCheckFill } from "react-icons/ri";
import { TbCertificate } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import logo from "../assets/Carrer_Copilot_Logo.png";

const Certificate = () => {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const certRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [scale, setScale] = useState(1);

  const [certName, setCertName] = useState("");

  // Mobilize both data points in one high-priority effect
  useEffect(() => {
    const initializeCertificate = async () => {
      if (!user) return;
      
      try {
        // Parallel execution: Get resume status and refresh global profile simultaneously
        const [resumeRes, profileData] = await Promise.all([
          supabase
            .from("resumes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("resume_status", "completed"),
          refreshProfile()
        ]);

        if (resumeRes.error) throw resumeRes.error;

        setIsUnlocked(resumeRes.count > 0);
        
        // Format the name immediately using the freshly refreshed global profile
        const rawName = profileData?.full_name || "Valued Candidate";
        const formattedName = rawName
          .trim()
          .split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        setCertName(formattedName);

      } catch (err) {
        console.error("Certificate init error:", err);
      } finally {
        setIsChecking(false);
      }
    };

    initializeCertificate();
  }, [user]);

  // Mobile Responsiveness Logic
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const baseWidth = 950;
        if (containerWidth < baseWidth + 40) {
          setScale((containerWidth - 40) / baseWidth);
        } else {
          setScale(1);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isChecking, isUnlocked]);
  
  const handleDownloadPDF = async () => {
    if (!certRef.current) return;
    try {
      setIsSharing(true);
      const canvas = await html2canvas(certRef.current, {
        scale: 4, // Ultra-High Resolution (4x) for crystal clear printing
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 950,
        height: 670,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const cert = clonedDoc.getElementById("cert-canvas");
          if (cert) {
            cert.style.transform = "none";
            cert.style.position = "fixed";
            cert.style.top = "0";
            cert.style.left = "0";
            cert.style.margin = "0";
            cert.style.width = "950px";
            cert.style.height = "670px";
            const all = cert.querySelectorAll('*');
            all.forEach(el => {
              el.style.outline = 'none';
              el.style.boxShadow = 'none';
            });
          }
        }
      });
      
      // Use JPEG with 98% quality - Near lossless but much lighter than PNG (Target ~900KB - 1MB)
      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      // A4 landscape size is exactly 297mm x 210mm
      pdf.addImage(imgData, "JPEG", 0, 0, 297, 210);
      pdf.save("Career_Copilot_Certification.pdf");
      
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };
  
  const handleDownloadPNG = async () => {
    if (!certRef.current) return;
    
    try {
      setIsSharing(true);
      
      const canvas = await html2canvas(certRef.current, {
        scale: 4, // Ultra-High Resolution
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 950,
        height: 670,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          const cert = clonedDoc.getElementById("cert-canvas");
          if (cert) {
            // Lock the element into a clean, zero-scroll static position
            cert.style.transform = "none";
            cert.style.position = "fixed";
            cert.style.top = "0";
            cert.style.left = "0";
            cert.style.margin = "0";
            cert.style.width = "950px";
            cert.style.height = "670px";
            
            // Clean up outlines that might affect centering boundaries
            const all = cert.querySelectorAll('*');
            all.forEach(el => {
              el.style.outline = 'none';
              el.style.boxShadow = 'none';
            });
          }
        }
      });
      
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `Career_Copilot_Certification.png`;
      link.click();

    } catch (error) {
      console.error("PNG export error:", error);
      alert("Failed to generate high-res PNG. Please try again or use PDF.");
    } finally {
      setIsSharing(false);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#35008B]"></div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#f8fafc] py-20 px-4 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-[#f1f5f9] text-center animate-page-entry">
          <div className="w-20 h-20 bg-[#eef2ff] text-[#35008B] rounded-full flex items-center justify-center mx-auto mb-6">
            <FiLock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-[#0f172a] mb-4">Certificate Locked</h2>
          <p className="text-[#64748b] mb-8 leading-relaxed">
            Please complete creating your resume and download it to unlock your official certification. Once you've downloaded your resume, you can share your certificate.
          </p>
          <button 
            onClick={() => navigate("/dashboard")}
            className="w-full bg-[#35008B] text-white font-bold py-4 rounded-xl shadow-lg hover:opacity-90 transition transform hover:scale-[1.02]"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-6 md:py-10 px-4" ref={containerRef}>
      {/* Global CSS for PDF Printing */}
      <style>{`
        @page {
          size: landscape;
          margin: 10mm !important; /* Safe buffer to prevent printer from trimming borders */
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #cert-canvas, #cert-canvas * {
            visibility: visible;
          }
          #cert-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            transform: scale(0.95) !important;
            transform-origin: top left !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          /* This pseudo-element forces the purple border to print even if the browser strips background colors for ink saving */
          #cert-canvas::after {
            content: "" !important;
            position: absolute !important;
            inset: 0 !important;
            border: 12px solid #35008B !important;
            box-sizing: border-box !important;
            pointer-events: none !important;
            z-index: 50 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-[1000px] mx-auto flex flex-col items-center">
        
        {/* Controls */}
        <div className="w-full mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 no-print animate-page-entry">
          <div className="flex gap-3">
            <button 
              onClick={handleDownloadPNG} 
              disabled={isSharing}
              className="bg-white border-2 border-[#e2e8f0] px-5 py-2.5 rounded-xl text-[#1e293b] font-bold hover:bg-[#f8fafc] hover:border-[#35008B] transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <FiShare2 className={isSharing ? "animate-spin" : "text-[#35008B]"} />
              {isSharing ? "Processing..." : "Download High-Res PNG"}
            </button>
            <button 
              onClick={handleDownloadPDF} 
              className="bg-[#35008B] px-6 py-2.5 rounded-xl text-white font-bold hover:opacity-90 transition shadow-lg flex items-center gap-2 text-sm"
            >
              <FiDownload /> Download Official PDF
            </button>
          </div>
        </div>

        {/* Certificate Container with Mobile Scaling */}
        <div 
          className="relative transition-all duration-300 mx-auto"
          style={{ 
            width: `${950 * scale}px`,
            height: `${670 * scale}px`,
            overflow: 'hidden'
          }}
        >
          <div 
            ref={certRef}
            id="cert-canvas"
            className="relative bg-white shadow-xl print:shadow-none"
            style={{ 
              width: '950px', 
              height: '670px', 
              padding: '12px',
              background: '#35008B',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          >
            <div className="w-full h-full bg-white relative flex flex-col items-center p-10 overflow-hidden shadow-[inset_0_0_0_1px_rgba(251,191,36,0.2)]">
              
              {/* Backdrop - High Precision Centering */}
              <div 
                className="absolute opacity-[0.08] pointer-events-none select-none"
                style={{ 
                  left: '50%', 
                  top: '50%', 
                  transform: 'translate(-50%, -50%)',
                  width: '500px'
                }}
              >
                <img src={logo} alt="" className="w-full h-auto" />
              </div>

              {/* Borders */}
              <div className="absolute inset-4 border-[1px] border-[#35008B] opacity-20" />
              <div className="absolute inset-6 border-[2px] border-[#fbbf24] opacity-30" />

              {/* Header - Absolute Positioned to prevent layout shifts */}
              <div className="absolute top-10 left-10 z-20">
                <img src={logo} alt="Logo" className="h-16 object-contain" />
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full mt-2">
                <div className="mb-4">
                  <TbCertificate size={40} className="text-[#fbbf24]" />
                </div>
                
                <h4 className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-[.4em] mb-2">OFFICIAL COMMENDATION</h4>
                <h1 className="text-4xl font-['Cinzel'] font-bold text-[#35008B] mb-6 uppercase tracking-wide">Certificate Of Completion</h1>
                <div className="w-24 h-[1px] bg-[#fbbf24] mb-8" />

                <p className="text-sm text-[#64748b] italic mb-0">This Is To Officially Certify That</p>
                
                <h2 className="text-6xl font-normal text-[#0f172a] mt-6 mb-8 font-['Alex_Brush',_cursive] capitalize">
                  {certName || "Valued Candidate"}
                </h2>

                <p className="text-sm text-[#475569] max-w-xl leading-relaxed">
                  Has Successfully Completed The Advanced Program In <br/>
                  <span className="font-bold text-[#0f172a]">Strategic Career Development & AI-Optimized Resume Engineering</span>. <br/>
                  In Recognition Of Demonstrating Exceptional Proficiency Throughout The Certification Process.
                </p>
              </div>

              {/* Footer - High Precision Spacing */}
              <div className="w-full flex justify-between items-end mt-1 px-4 relative z-10">
                <div className="text-left w-1/3 pb-2">
                  <p className="text-[9px] text-[#94a3b8] font-bold uppercase tracking-widest mb-1">Issue Date</p>
                  <p className="text-xs font-bold text-[#1e293b]">{currentDate}</p>
                </div>

                <div className="w-1/3 flex justify-center -translate-y-1">
                  <div className="relative w-16 h-16 rounded-full border-[2px] border-double border-[#fbbf24] flex items-center justify-center bg-white shadow-md">
                    <RiShieldCheckFill size={28} className="text-[#35008B]" />
                  </div>
                </div>

                <div className="text-right w-1/3 flex flex-col items-end pb-2">
                  <div className="relative mb-5 pr-2">
                    <p className="text-[20px] font-['Caveat',_cursive] text-[#35008B] leading-none italic whitespace-nowrap">
                      Dr.TM Praneeth Naidu
                    </p>
                  </div>
                  <div className="w-36 h-[1px] bg-[#0f172a] opacity-60 mb-2" />
                  <p className="text-[10px] font-black text-[#0f172a] uppercase tracking-tighter">DR.TM PRANEETH NAIDU</p>
                  <p className="text-[8px] text-[#94a3b8] font-bold uppercase tracking-widest">Chief Executive Officer</p>
                  <p className="text-[8px] text-[#64748b] font-bold uppercase tracking-widest">Cognisys Ai</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0 !important; }
          html, body {
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          #cert-canvas { 
            box-shadow: none !important; 
            margin: 0 !important; 
            border: none !important;
            width: 100vw !important; 
            height: 100vh !important;
            transform: none !important; 
            position: fixed !important; 
            top: 0 !important; 
            left: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999999 !important;
          }
           #cert-canvas > div {
             width: 100% !important;
             height: 100% !important;
             border: none !important;
             padding: 40px !important;
           }
        }
      `}} />
    </div>
  );
};

export default Certificate;
