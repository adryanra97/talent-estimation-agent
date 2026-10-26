import io

from openpyxl import Workbook

from talent_estimation.catalog import load_catalog_file


def test_default_catalog(catalog):
    assert catalog.roles_for_scope("data") == ["DE", "DA", "DS", "AI"]
    assert catalog.roles_for_scope("design") == []
    assert catalog.match_role("DE1 (Data Engineer), Business Analyst") == ["DE"]
    assert {c.key for c in catalog.ai_categories} >= {"routine_code", "judgment"}
    assert all(c.min_saving <= c.default_saving <= c.max_saving for c in catalog.ai_categories)


def test_excel_catalog_upload():
    wb = Workbook()
    ws = wb.active
    ws.title = "Scope_Capability"
    ws.append(["Kode", "Capability", "In-scope", "Out", "Kata kunci", "Pendukung"])
    ws.append(["DE", "Data Engineer", "Pipeline", "UI", "etl", "mapping"])
    ps = wb.create_sheet("Pilar_Skill")
    ps.append(["Kode", "Pilar", "Skill"])
    ps.append(["DE", "SQL", "Query · Modeling"])
    buf = io.BytesIO()
    wb.save(buf)
    cat = load_catalog_file("x.xlsx", buf.getvalue())
    assert list(cat.roles) == ["DE"]
    assert cat.roles["DE"].pillars == {"SQL": ["Query", "Modeling"]}


def test_catalog_excel_round_trip(catalog):
    from talent_estimation.catalog import catalog_to_excel

    again = load_catalog_file("katalog.xlsx", catalog_to_excel(catalog))
    for code, role in catalog.roles.items():
        copy = again.roles[code]
        assert copy.summary == role.summary
        assert copy.capability_areas == role.capability_areas
        assert copy.in_scope == role.in_scope
        assert copy.substitutes == role.substitutes
        assert copy.aliases == role.aliases
        assert copy.pillars == role.pillars
