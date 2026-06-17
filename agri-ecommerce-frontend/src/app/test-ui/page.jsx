import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function TestUiPage() {
  return (
    <main className="min-h-screen bg-background p-8">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Test shadcn/ui</CardTitle>
          <CardDescription>
            Kiểm tra giao diện cho hệ thống nông sản trực tuyến.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input placeholder="Nhập tên sản phẩm nông sản..." />

          <div className="flex gap-2">
            <Badge>Còn hàng</Badge>
            <Badge variant="secondary">Nông sản sạch</Badge>
          </div>

          <Button>Kiểm tra giao diện</Button>
        </CardContent>
      </Card>
    </main>
  );
}