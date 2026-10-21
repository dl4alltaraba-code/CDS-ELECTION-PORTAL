-- SETTINGS
-- ==========================================
INSERT OR IGNORE INTO settings (key, value) VALUES ('voting_enabled', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('results_visible', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('candidates_voting_visible', 'true');

-- ==========================================
-- CANDIDATES (17 candidates, 8 positions)
-- ==========================================

-- PRESIDENT (2 candidates)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (1, 'Bako-Gaiya Shunanum', 'President', 'DL4ALL, in partnership with NITDA, has been charged with the responsibility of creating awareness on digital literacy, empowering members of the CDS with digital skills and educating the informal sector on the use of digital tools. This is in the bid to attain a 70% percent digital literacy across the country. It is with this that I wish to declare my interest to run for the office of the president. Leadership is not about the office or position occupied but is rather a call to dedication and responsibility to service, teamwork and ensuring wholistic advancement.', '/images/candidates/shuna-bako.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (2, 'Agada Catherine Eneh', 'President', 'As a Digital Literacy for All CDS, I intend when I get to office see that digital literacy training of the informal sector is carried out as developed by the National Information Technology Agency and core mandate of the CDS. Also, that School adoption programs will take place and other digital literacy program that will help the host community and the CDS members.', '/images/candidates/catherine-agada.jpg');

-- VICE PRESIDENT (1 candidate)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (3, 'Emmanuel Longji Joel', 'Vice President', 'I stand before you not merely as a candidate, but as someone who deeply believes in the power of service, collaboration, and vision. Digital literacy is no longer a luxury. It is a necessity. I will promote stronger teamwork among members, support initiatives that extend our outreach programs, encourage creative ideas and innovative projects, and work to ensure that members feel valued, supported, and motivated to contribute their best. Leadership is not about position, but responsibility.', '/images/candidates/emmanuel-longji-joel.jpg');

-- GENERAL SECRETARY (2 candidates)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (4, 'Olobo Rejoice Daniel', 'General Secretary', 'I am contesting for the position of Secretary of the Digital Literacy for All CDS group. My focus areas: Clear Communication to ensure timely updates, Proper Documentation to maintain accurate records, Organized Outreach to support better coordination, Digital Record Keeping for well-organized records, and Member Engagement to encourage active participation. If elected, I will serve with dedication, responsibility, and transparency.', '/images/candidates/rejoice-daniel.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (5, 'Ibrahim Favour Deborah', 'General Secretary', 'My goal is to create a very professional and well-organized CDS that excels in open communication, careful record-keeping, and significant community involvement. I will make sure our operations are effective, accessible, and accountable to each member by implementing streamlined digital solutions for reporting and documentation. I am dedicated to working with others on strategic projects that equip our host community with critical 21st-century skills.', '/images/candidates/favour-ibrahim.jpg');

-- TREASURER (1 candidate)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (6, 'Ibrahim Zainab Ibrahim', 'Treasurer', 'I am running for Treasurer to manage our funds with honesty, transparency, and care. I will keep clear records, support projects responsibly, and ensure every contribution is used wisely. Your trust matters.', '/images/candidates/zainab-ibrahim.jpg');

-- FINANCIAL SECRETARY (3 candidates)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (7, 'Ike Uleko Happiness', 'Financial Secretary', 'I am convinced that effective financial management is crucial for the success and growth of our CDS. If elected, I pledge to perform my duties with honesty, accountability and transparency. My plans include: Accurate Record Keeping, Transparency in Financial Matters, Proper Documentation, Safe Keeping of Financial Records, and Promotion of Financial Discipline.', '/images/candidates/happiness-ike.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (8, 'Nyam Tavershima', 'Financial Secretary', 'I humbly present myself as a candidate for Financial Secretary. My administration will focus on: Transparency and Accountability with regular financial reports, Proper Record Keeping, Efficient Fund Management, Prompt Collection of Dues, Financial Planning and Growth, and Integrity and Service. I pledge to serve with honesty, dedication, and fairness.', '/images/candidates/nyam-tavershima.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (9, 'Ayinlo Miracle Yohanna', 'Financial Secretary', 'With a background in Accounting and skills in financial analysis, I do not just handle money — I track it, analyze it, and make it make sense. What I am bringing: 100% transparency, Digital tracking with clean organized records, Accountability for every kobo, and Smart spending with no waste, just results.', '/images/candidates/miracle-yohanna.jpg');

-- WELFARE SECRETARY (2 candidates)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (10, 'Ishaku Mary', 'Welfare Secretary', 'My goal is to promote the well-being, unity, and support of every member. If elected, I will work hard to ensure that every corps member feels valued, supported, and cared for. No one will ever feel left out. I am set out to promote unity and cooperation among members, ensure maximum support during sickness or challenges, help organize welfare activities, and encourage care and concern for one another.', '/images/candidates/mary-ishaku.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (11, 'Joy Alkali', 'Welfare Secretary', 'I humbly declare my interest in serving as Welfare Secretary of our CDS, committed to prioritizing the well-being, unity, and fair treatment of every member. I will ensure prompt response to members needs, promote inclusiveness and effective communication, and uphold transparency, accountability, and compassion in all responsibilities.', '/images/candidates/joy-alkali.jpg');

-- PROJECT MANAGER (5 candidates)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (12, 'Onah Christian Ogbole', 'Project Manager', 'I am a graduate with a strong passion for technology and innovation. With Data Analysis skills and Data Science background, I am equipped with analytical and problem-solving abilities necessary for effective project management. A true leader does not merely create followers but raises more leaders. If given the opportunity, I will work collaboratively to plan, coordinate, and successfully implement campaigns.', '/images/candidates/christian-onah.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (13, 'Samaila Habibu', 'Project Manager', 'My goal is to promote effective planning, teamwork, and timely execution of projects for the growth and success of our CDS. If elected, I will ensure proper coordination of projects, responsible use of resources, transparency, and completion of tasks within the planned time. Together, we can turn ideas into successful projects that benefit everyone.', '/images/candidates/samaila-habibu.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (14, 'Zacharias Confidence', 'Project Manager', 'I believe the essence of CDS is to create real impact in our host community. My three key priorities: Impactful Projects - reviving school adoption and bringing hands-on practical courses; Transparency and Accountability - clear communication and responsible resource management; Team Participation - encouraging collaboration so every corps member contributes.', '/images/candidates/confidence-zacharias.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (15, 'Tsegban Moses Terdue', 'Project Manager', 'I am excited to contest for Project Manager to bring initiatives that will address community needs and foster growth. I am interested in collaborating with teams especially Tech Groups that build capacity and achieve shared goals in Digital Literacy. I will ensure clear communication and responsible resource management. If elected, I will leverage my skills to turn our CDS goals into tangible outcomes.', '/images/candidates/tsegban-moses.jpg');

INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (16, 'Mnzughurga Philip Terhemba', 'Project Manager', 'I am ready to lead impactful digital literacy projects as a Project Manager at CDS. With my skills and passion for empowering communities, I am confident I can drive success. I am eager to leverage my expertise to make a difference.', '/images/candidates/mnzughurga-philip.jpg');

-- PROVOST (1 candidate)
INSERT OR IGNORE INTO candidates (id, name, position, manifesto, image_url) VALUES (17, 'Abba Godwin Swanta', 'Provost', 'I have the intention to serve not only lead because leadership is not just by leading only, but being ready to serve also. I promise to give my best, ability, even resources to see the CDS grow in a good and higher level.', '/images/candidates/godwin-swanta.jpg');
